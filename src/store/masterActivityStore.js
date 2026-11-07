import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbStorage } from '@/lib/dbStorage'

// ─── Master Activity Point ────────────────────────────────────────────────────
// Katalog modul aktivitas beserta aturan poin, syarat penyelesaian (completion
// trigger), batas perolehan, dan opsi pengulangan. Menjadi referensi untuk
// course bertipe Activity Point. Tersimpan di Postgres (AppState) via dbStorage
// sehingga perubahan sync ke semua device.

export const ACTIVITY_CATEGORIES = ['Content', 'Assessment', 'Engagement', 'Community', 'Participation Point']
export const ACTIVITY_TRIGGERS   = ['On View', 'On Submit', 'On Pass Grade', 'On Complete']

let _aid = 100
const aid = () => _aid++

const SEED = [
  { id:1,  activity_name:'Watch Video',          activity_code:'VIDEO',      category:'Content',       trigger:'On View',       point:10, max_earn:'1',         repeatable:false, cooldown:0,  min_grade:0,  description:'Menonton video pembelajaran sampai selesai', status:'Active' },
  { id:2,  activity_name:'Read Material',        activity_code:'READ',       category:'Content',       trigger:'On View',       point:5,  max_earn:'1',         repeatable:false, cooldown:0,  min_grade:0,  description:'Membaca materi / handout hingga selesai', status:'Active' },
  { id:3,  activity_name:'Complete SCORM',       activity_code:'SCORM',      category:'Content',       trigger:'On Complete',   point:25, max_earn:'1',         repeatable:false, cooldown:0,  min_grade:0,  description:'Menyelesaikan paket SCORM / e-learning package', status:'Active' },
  { id:4,  activity_name:'Interactive (H5P)',    activity_code:'H5P',        category:'Content',       trigger:'On Complete',   point:15, max_earn:'1',         repeatable:false, cooldown:0,  min_grade:0,  description:'Menyelesaikan konten interaktif H5P', status:'Active' },
  { id:5,  activity_name:'Download File',        activity_code:'DOWNLOAD',   category:'Content',       trigger:'On View',       point:2,  max_earn:'Unlimited', repeatable:true,  cooldown:0,  min_grade:0,  description:'Mengunduh file materi', status:'Active' },
  { id:6,  activity_name:'Quiz Passed',          activity_code:'QUIZ_PASS',  category:'Assessment',    trigger:'On Pass Grade', point:20, max_earn:'1',         repeatable:false, cooldown:0,  min_grade:70, description:'Lulus kuis dengan nilai minimum kelulusan', status:'Active' },
  { id:7,  activity_name:'Assignment Submitted', activity_code:'ASSIGNMENT', category:'Assessment',    trigger:'On Submit',     point:30, max_earn:'1',         repeatable:false, cooldown:0,  min_grade:0,  description:'Mengumpulkan tugas', status:'Active' },
  { id:8,  activity_name:'Workshop / Peer Review',activity_code:'WORKSHOP',  category:'Assessment',    trigger:'On Complete',   point:35, max_earn:'1',         repeatable:false, cooldown:0,  min_grade:0,  description:'Menyelesaikan penilaian sejawat (peer assessment)', status:'Active' },
  { id:9,  activity_name:'Forum Discussion',     activity_code:'DISCUSSION', category:'Community', trigger:'On Submit',     point:15, max_earn:'3',         repeatable:true,  cooldown:24, min_grade:0,  description:'Membuat post di forum diskusi', status:'Active' },
  { id:13, activity_name:'Trainer',              activity_code:'TRAINER',    category:'Community', trigger:'On Complete',   point:50, max_earn:'Unlimited', repeatable:true,  cooldown:0,  min_grade:0,  description:'Menjadi trainer / fasilitator pada sesi pembelajaran komunitas', status:'Active' },
  { id:10, activity_name:'Survey Completed',     activity_code:'SURVEY',     category:'Engagement',    trigger:'On Submit',     point:10, max_earn:'1',         repeatable:false, cooldown:0,  min_grade:0,  description:'Menyelesaikan survei / kuesioner', status:'Active' },
  { id:11, activity_name:'Course Feedback',      activity_code:'FEEDBACK',   category:'Engagement',    trigger:'On Submit',     point:5,  max_earn:'1',         repeatable:false, cooldown:0,  min_grade:0,  description:'Memberi feedback / rating course', status:'Active' },
  { id:12, activity_name:'Attendance (Session)', activity_code:'ATTENDANCE', category:'Engagement',    trigger:'On Complete',   point:20, max_earn:'Unlimited', repeatable:true,  cooldown:0,  min_grade:0,  description:'Hadir pada sesi kelas / webinar', status:'Active' },
  { id:14, activity_name:'Pengajar',              activity_code:'PENGAJAR',         category:'Participation Point', trigger:'On Complete', point:60, max_earn:'Unlimited', repeatable:true, cooldown:0, min_grade:0, description:'Menjadi pengajar pada sesi pembelajaran', status:'Active' },
  { id:15, activity_name:'Develop Module',        activity_code:'DEVELOP_MODULE',   category:'Participation Point', trigger:'On Complete', point:50, max_earn:'Unlimited', repeatable:true, cooldown:0, min_grade:0, description:'Mengembangkan modul / materi pembelajaran', status:'Active' },
  { id:16, activity_name:'Coaching',              activity_code:'COACHING',         category:'Participation Point', trigger:'On Complete', point:40, max_earn:'Unlimited', repeatable:true, cooldown:0, min_grade:0, description:'Memberikan coaching kepada peserta', status:'Active' },
  { id:17, activity_name:'Mentoring',             activity_code:'MENTORING',        category:'Participation Point', trigger:'On Complete', point:40, max_earn:'Unlimited', repeatable:true, cooldown:0, min_grade:0, description:'Memberikan mentoring kepada peserta', status:'Active' },
  { id:18, activity_name:'Creating Learning Tools',activity_code:'LEARNING_TOOLS',  category:'Participation Point', trigger:'On Complete', point:45, max_earn:'Unlimited', repeatable:true, cooldown:0, min_grade:0, description:'Membuat alat bantu / tools pembelajaran', status:'Active' },
  { id:19, activity_name:'Peserta Training',      activity_code:'PESERTA_TRAINING', category:'Participation Point', trigger:'On Complete', point:25, max_earn:'Unlimited', repeatable:true, cooldown:0, min_grade:0, description:'Mengikuti training sebagai peserta', status:'Active' },
  { id:20, activity_name:'Best Student',          activity_code:'BEST_STUDENT',     category:'Participation Point', trigger:'On Complete', point:75, max_earn:'Unlimited', repeatable:true, cooldown:0, min_grade:0, description:'Menjadi peserta terbaik dalam training', status:'Active' },
]

export const useMasterActivityStore = create(
  persist(
    (set) => ({
      activities: SEED.map(a => ({ ...a })),

      addActivity: (data) =>
        set(s => ({ activities: [...s.activities, { id: aid(), ...data }] })),
      updateActivity: (id, patch) =>
        set(s => ({ activities: s.activities.map(a => a.id === id ? { ...a, ...patch } : a) })),
      deleteActivity: (id) =>
        set(s => ({ activities: s.activities.filter(a => a.id !== id) })),
      toggleStatus: (id) =>
        set(s => ({ activities: s.activities.map(a =>
          a.id === id ? { ...a, status: a.status === 'Active' ? 'Inactive' : 'Active' } : a) })),
    }),
    { name: 'hcm-master-activity-v1', version: 1, storage: createJSONStorage(() => dbStorage) }
  )
)
