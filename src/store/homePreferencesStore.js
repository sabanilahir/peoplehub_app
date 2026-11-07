import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

// Per-user preferences for what shows on the home/dashboard page — set from
// the "Preferensi Beranda" (Homepage Preferences) page, reachable from the
// user menu in the topbar.
//
// The home page is composed of top-level sections: Announcement, Menu
// Shortcut, Things To Do, and four role dashboards (ESS / MSS / HR /
// Superadmin). Which dashboards a user may see at all is a role question
// answered in dashboard/page.jsx — these preferences only decide what an
// eligible user chooses to show.
//
// Announcement is deliberately absent from the show/hide flags: company
// announcements are mandatory, so a user may only reorder it (order.announcement),
// never switch it off.
const DEFAULT_PREFS = {
  showMenuShortcuts: true,
  showThingsToDo: true,
  showEssDashboard: true,
  showMssDashboard: true,
  showHrDashboard: true,
  showSuperadminDashboard: true,
  widgets: {
    // ESS
    timeCard: true, leaveBalance: true, leaveChart: true,
    // MSS
    teamLeaveChart: true,
    // HR
    headcountChart: true,
    demographyGender: true, demographyReligion: true,
    demographyAge: true, demographyCompany: true,
    // Superadmin
    userRoleChart: true,
  },
  hiddenShortcutIds: [],
  // Shape of each chart widget: 'bar' | 'pie', keyed by widget key. Left empty
  // because bar is the default — readers use CHART_TYPE_DEFAULT as the
  // fallback, so a newly added chart needs no entry here.
  chartType: {},
  // Display order — smaller number = higher up. All top-level sections stack
  // in one ordered column; widgetOrder.* then reorders widgets *within* their
  // own dashboard (each dashboard numbers its widgets from 1 independently).
  order: {
    announcement: 1, menuShortcuts: 2, thingsToDo: 3,
    essDashboard: 4, mssDashboard: 5, hrDashboard: 6, superadminDashboard: 7,
  },
  widgetOrder: {
    timeCard: 1, leaveBalance: 2, leaveChart: 3,
    teamLeaveChart: 1,
    headcountChart: 1,
    demographyGender: 2, demographyReligion: 3,
    demographyAge: 4, demographyCompany: 5,
    userRoleChart: 1,
  },
}

export const CHART_TYPE_DEFAULT = 'bar'

// Drop undefined values so a migration never overwrites a default with one.
const defined = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined))

// Prefs saved before the dashboard split had a single "Dashboard Widget"
// section (showDashboardWidgets) holding every widget, with the role charts
// keyed employeeChart/managerChart/hrChart/superadminChart. Carry that state
// across rather than silently resetting a user's toggles.
function migrate(saved) {
  if (saved.showDashboardWidgets === undefined) return saved
  const { showDashboardWidgets: shown, ...rest } = saved
  const w = saved.widgets || {}
  const wo = saved.widgetOrder || {}
  return {
    ...rest,
    showEssDashboard: shown,
    showMssDashboard: shown,
    showHrDashboard: shown,
    showSuperadminDashboard: shown,
    widgets: defined({
      timeCard: w.timeCard, leaveBalance: w.leaveBalance,
      leaveChart: w.employeeChart,
      teamLeaveChart: w.managerChart,
      headcountChart: w.hrChart,
      userRoleChart: w.superadminChart,
    }),
    // The old single section's position becomes the ESS dashboard's; the other
    // three fall to their defaults, right after it.
    order: defined({ ...(saved.order || {}), essDashboard: saved.order?.dashboardWidgets }),
    widgetOrder: defined({
      timeCard: wo.timeCard, leaveBalance: wo.leaveBalance,
      leaveChart: wo.employeeChart,
    }),
  }
}

export const useHomePreferencesStore = create(persist(
  (set, get) => ({
    prefs: {}, // userId -> preferences

    getPrefs: (userId) => {
      const saved = migrate(get().prefs[userId] || {})
      return {
        ...DEFAULT_PREFS,
        ...saved,
        widgets: { ...DEFAULT_PREFS.widgets, ...(saved.widgets || {}) },
        order: { ...DEFAULT_PREFS.order, ...(saved.order || {}) },
        widgetOrder: { ...DEFAULT_PREFS.widgetOrder, ...(saved.widgetOrder || {}) },
        chartType: { ...DEFAULT_PREFS.chartType, ...(saved.chartType || {}) },
      }
    },

    updatePrefs: (userId, patch) => set((s) => ({
      prefs: { ...s.prefs, [userId]: { ...get().getPrefs(userId), ...patch } },
    })),

    toggleShortcut: (userId, shortcutId) => set((s) => {
      const current = get().getPrefs(userId)
      const hidden = current.hiddenShortcutIds.includes(shortcutId)
        ? current.hiddenShortcutIds.filter(id => id !== shortcutId)
        : [...current.hiddenShortcutIds, shortcutId]
      return { prefs: { ...s.prefs, [userId]: { ...current, hiddenShortcutIds: hidden } } }
    }),
  }),
  { name: 'hcm-home-preferences-v1', storage: createJSONStorage(() => dbStorage) }
))
