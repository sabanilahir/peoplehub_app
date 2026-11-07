import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Home, User, Users, Settings, BookOpen, Briefcase, Clock, Calendar, DollarSign, TrendingUp, Star, Award, Clipboard, UserCheck, Building2, Target, AlertCircle, CheckCircle, Trophy, Shield, Key } from 'lucide-react'

export const ICON_MAP = {
  home: Home,
  user: User,
  users: Users,
  settings: Settings,
  book: BookOpen,
  briefcase: Briefcase,
  clock: Clock,
  calendar: Calendar,
  dollar: DollarSign,
  trending: TrendingUp,
  star: Star,
  award: Award,
  clipboard: Clipboard,
  userCheck: UserCheck,
  building: Building2,
  target: Target,
  alert: AlertCircle,
  check: CheckCircle,
  trophy: Trophy,
  shield: Shield,
  key: Key,
  menu: Clipboard,
}
