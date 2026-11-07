import { NextResponse} from 'next/server'
import { prisma} from '@/lib/prisma'

export async function GET() {
 try{
  const permissions = await prisma.permission.findMany({
  orderBy: {id: 'asc'}
 })
  return NextResponse.json(permissions)
 }catch(e){
  return NextResponse.json({error: e.message}, {status: 500})
 }
}

export async function POST(req) {
 try{
  const body = await req.json()
  const permission = await prisma.permission.create({
   data: body
 })
  return NextResponse.json(permission, {status: 201})
 }catch(e){
  return NextResponse.json({error: e.message}, {status: 500})
 }
}