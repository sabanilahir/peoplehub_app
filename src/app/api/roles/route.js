import { NextResponse} from 'next/server'
import { prisma} from '@/lib/prisma'

export async function GET() {
 try{
  const roles = await prisma.role.findMany({
  orderBy: {id: 'asc'}
 })
  return NextResponse.json(roles)
 }catch(e){
  return NextResponse.json({error: e.message}, {status: 500})
 }
}

export async function POST(req) {
 try{
  const body = await req.json()
  const role = await prisma.role.create({
   data: body
 })
  return NextResponse.json(role, {status: 201})
 }catch(e){
  return NextResponse.json({error: e.message}, {status: 500})
 }
}