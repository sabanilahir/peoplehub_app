'use client'
// One-time backfill so the DATABASE is the literal source of truth for every
// module: on first load, any store whose state isn't in the AppState table yet
// gets its current (seed) state pushed up. After that, all devices read the same
// data from the DB. Runs only when a database is reachable (the /api/state call
// succeeds); offline it does nothing and the app keeps using localStorage.

import { useOnboardingStore }          from '@/store/onboardingStore'
import { useOnboardingRulesStore }     from '@/store/onboardingRulesStore'
import { useMasterFormStore }          from '@/store/masterFormStore'
import { useOffboardingChecklistStore } from '@/store/offboardingChecklistStore'
import { useOffboardingNotifyStore }   from '@/store/offboardingNotifyStore'
import { useExitInterviewStore }       from '@/store/exitInterviewStore'
import { usePersonnelActionStore }     from '@/store/personnelActionStore'
import { useTalentReviewStore }        from '@/store/talentReviewStore'
import { useTrmStore }                 from '@/store/trmStore'
import { useTalentStore }              from '@/store/talentStore'
import { useSuccessionPlanStore }      from '@/store/successionPlanStore'
import { useIdpStore }                 from '@/store/idpStore'
import { useTalentCycleStore }         from '@/store/talentCycleStore'
import { useKeyPositionStore }         from '@/store/keyPositionStore'
import { useVacancyRiskStore }         from '@/store/vacancyRiskStore'
import { useSuccessorReadinessStore }  from '@/store/successorReadinessStore'
import { useCompetencyAssessmentStore } from '@/store/competencyAssessmentStore'
import { useBrandingStore }            from '@/store/brandingStore'
import { useCertificateStore }         from '@/store/certificateStore'
import { useCompetencyStore }          from '@/store/competencyStore'
import { useCongratulationStore }      from '@/store/congratulationStore'
import { useContractEvaluationStore }  from '@/store/contractEvaluationStore'
import { useCourseBatchStore }         from '@/store/courseBatchStore'
import { useEvaluationStore }          from '@/store/evaluationStore'
import { useFeedbackStore }            from '@/store/feedbackStore'
import { useHayStore }                 from '@/store/hayStore'
import { usePipStore }                 from '@/store/pipStore'
import { usePositionProfileStore }     from '@/store/positionProfileStore'
import { useUserlistStore }            from '@/store/userlistStore'
import { useVipStore }                 from '@/store/vipStore'
import { useWorkflowStore }            from '@/store/workflowStore'
import { useMasterActivityStore }      from '@/store/masterActivityStore'
import { useLeaderboardSettingStore }  from '@/store/leaderboardSettingStore'
import { useAttendanceStore }          from '@/store/attendanceStore'
import { useHolidayStore }             from '@/store/holidayStore'
import { useLeaveStore }               from '@/store/leaveStore'
import { usePayrollStore }             from '@/store/payrollStore'
import { useShiftStore }               from '@/store/shiftStore'
import { useAdjustmentPlanStore }      from '@/store/adjustmentPlanStore'
import { useRktkPlanStore }            from '@/store/rktkPlanStore'

const STORES = [
  useOnboardingStore, useOnboardingRulesStore, useMasterFormStore,
  useOffboardingChecklistStore, useOffboardingNotifyStore, useExitInterviewStore, usePersonnelActionStore,
  useTalentReviewStore, useTrmStore, useTalentStore, useSuccessionPlanStore, useIdpStore, useTalentCycleStore,
  useKeyPositionStore, useVacancyRiskStore, useSuccessorReadinessStore, useCompetencyAssessmentStore,
  useBrandingStore, useCertificateStore, useCompetencyStore, useCongratulationStore, useContractEvaluationStore,
  useCourseBatchStore, useEvaluationStore, useFeedbackStore, useHayStore, usePipStore, usePositionProfileStore,
  useUserlistStore, useVipStore, useWorkflowStore, useMasterActivityStore,
  useLeaderboardSettingStore,
  useAttendanceStore, useHolidayStore, useLeaveStore, usePayrollStore, useShiftStore,
  useAdjustmentPlanStore, useRktkPlanStore,
]

// Force persist to write the store's current state (triggers dbStorage.setItem).
const pushUp = (useStore) => { try { useStore.setState({ ...useStore.getState() }) } catch {} }

export function runStateBackfill() {
  if (typeof window === 'undefined' || window.__kpbStateBackfilled) return
  window.__kpbStateBackfilled = true
  fetch('/api/state')
    .then(r => (r.ok ? r.json() : null))
    .then(map => {
      if (!map) return // no database reachable → keep localStorage behaviour
      for (const useStore of STORES) {
        const name = useStore.persist?.getOptions?.().name
        if (!name || map[name] != null) continue // absent store or already in DB
        if (useStore.persist?.hasHydrated?.()) pushUp(useStore)             // hydrated → write now
        else useStore.persist?.onFinishHydration?.(() => pushUp(useStore))  // else after hydration
      }
    })
    .catch(() => {})
}
