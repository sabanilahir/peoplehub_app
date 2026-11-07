import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(){
  return NextResponse.json({ message: 'Sync - POST to sync' })
}

export async function POST(){
  try{
    const menus = [
      {key:'dashboard',label:'Dashboard',icon:'home',href:'/dashboard',parentId:null,roles:'["*"]',order:1,active:true},
      {key:'ess',label:'ESS',icon:'user',parentId:null,roles:'["*"]',order:2,active:true},
      {key:'ess-profile',label:'My Profile',icon:'user',href:'/ess/profile',parentId:null,roles:'["*"]',order:1,active:true},
      {key:'ess-attendance',label:'Attendance',icon:'clock',href:'/ess/attendance',parentId:null,roles:'["*"]',order:2,active:true},
      {key:'ess-leave',label:'Leave',icon:'calendar',href:'/ess/leave',parentId:null,roles:'["*"]',order:3,active:true},
      {key:'ess-payslip',label:'Payslip',icon:'dollar',href:'/ess/payslip',parentId:null,roles:'["*"]',order:4,active:true},
      {key:'learning',label:'Learning',icon:'book',parentId:null,roles:'["*"]',order:3,active:true},
      {key:'learning-catalog',label:'Course Catalog',icon:'book',href:'/learning/catalog',parentId:null,roles:'["*"]',order:1,active:true},
      {key:'hr',label:'HR',icon:'users',parentId:null,roles:'["hr","superadmin"]',order:4,active:true},
      {key:'hr-employee',label:'Employee Data',icon:'users',href:'/hr/employee',parentId:null,roles:'["hr","superadmin"]',order:1,active:true},
      {key:'mss',label:'MSS',icon:'briefcase',parentId:null,roles:'["manager","superadmin"]',order:5,active:true},
      {key:'mss-leave',label:'Approve Leave',icon:'check',href:'/mss/leave',parentId:null,roles:'["manager","superadmin"]',order:1,active:true},
      {key:'system',label:'System',icon:'settings',parentId:null,roles:'["superadmin"]',order:99,active:true},
      {key:'sys-users',label:'User Management',icon:'users',href:'/sysadmin/users',parentId:null,roles:'["superadmin"]',order:1,active:true},
      {key:'sys-role',label:'Role',icon:'shield',href:'/sysadmin/role',parentId:null,roles:'["superadmin"]',order:2,active:true},
      {key:'sys-perm',label:'Permission',icon:'key',href:'/sysadmin/permission',parentId:null,roles:'["superadmin"]',order:3,active:true},
    ]
    
    let mc=0
    for(const m of menus){
      await prisma.menuItem.upsert({where:{key:m.key},update:m,create:m})
      mc++
    }
    
    const roles = [
      {name:'superadmin',label:'Superadmin',color:'#dc2626'},
      {name:'hr_manager',label:'HR Manager',color:'#2563eb'},
      {name:'hr',label:'HR Staff',color:'#7c3aed'},
      {name:'manager',label:'Manager',color:'#059669'},
      {name:'employee',label:'Employee',color:'#d97706'},
    ]
    let rc=0
    for(const r of roles){
      await prisma.role.upsert({where:{name:r.name},update:r,create:r})
      rc++
    }
    
    const perms = [
      {key:'ess_profile_view',name:'View Profile',module:'ess'},
      {key:'ess_attendance_view',name:'View Attendance',module:'ess'},
      {key:'ess_leave_apply',name:'Apply Leave',module:'ess'},
      {key:'hr_emp_view',name:'View Employees',module:'hr'},
      {key:'hr_emp_create',name:'Create Employee',module:'hr'},
      {key:'mss_leave_approve',name:'Approve Leave',module:'mss'},
      {key:'sys_settings',name:'System Settings',module:'system'},
    ]
    let pc=0
    for(const p of perms){ 
      await prisma.permission.upsert({where:{key:p.key},update:p,create:p})
      pc++
    }
    
    return NextResponse.json({success:true,synced:{menus:mc,roles:rc,permissions:pc}})
  }catch(e){
    return NextResponse.json({success:false,error:e.message},{status:500})
  }
}
