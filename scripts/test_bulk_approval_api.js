const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const csvData = `ID,Name,Approval 1,Approval 2
23090100005,Tan Sui Lian,MOH. RAUL AMARULLAH,Devita Lesmana
23090100013,Nurcahya Sakti,Sandy,Novi Atien Purwana Putri
23091500014,Imam Mustadi,Sandy,Novi Atien Purwana Putri
23091500015,Tino Pratama,Sandy,Novi Atien Purwana Putri
23126000001,Muhammad Naufal Syauqii,Rhesa Gunawan,
23121100033,Valena Revelin,Devan Widiananda Rachman,
24010300048,Agusto Hendrik Fernando,Salma Aulia Insani,
24223000002,Muhamad Andri Saputra,Rhesa Gunawan,
24223000003,Alfitra Swary Fachreza,Rhesa Gunawan,
24409000004,Panut Al Bashir,Rhesa Gunawan,
24041600005,Didih Murodi,Rhesa Gunawan,
24041600083,Cindy Herawati,Rhesa Gunawan,
24041600084,Rizki Mulyono,Salma Aulia Insani,
24061900091,Muhammad Aryansyah,Rhesa Gunawan,
24060600006,Tajul,Rhesa Gunawan,
24061900096,Juhenah,Salma Aulia Insani,
24061900098,Nico Rahmat Fauzi,Andy Lesmana,
24072900007,Ismail,Rhesa Gunawan,
24072700100,Tika Fitriyah Dewi,Rhesa Gunawan,
24072900008,Daniel,Rhesa Gunawan,
24072900009,Hasan,Rhesa Gunawan,
24090200104,Novi Atien Purwana Putri,Andy Lesmana,
24011100110,Dian Rosnawaty,Ronny Daeng Badjie,
24102100111,Rini Indriani,Ronny Daeng Badjie,
24111200010,Sarta,Rhesa Gunawan,
24111400011,Pirlo Wan Saliem,Rhesa Gunawan,
24112600124,Dwi Widna Zhazanty,Salma Aulia Insani,
24114200126,Anne Marliane T.R,Agung Purnama,
24115800128,Ayu Fitriana Anjarwati,Nico Rahmat Fauzi,
25022600012,UTARY PRAMESTI RAHAYU,Salma Aulia Insani,
250224000142,Noel Jeconiah Janitra Setjo,Devan Widiananda Rachman,
250224000143,Gerry Krisnandi,muhammad rifki,
25030500154,Wanda Haptasari,Ronny Daeng Badjie,
25030500013,Andhika Agil Prasetya,Rhesa Gunawan,
25030500014,Maulana Malik Ibrahim,Rhesa Gunawan,
25031000015,Andre Ferdiansyah,Rhesa Gunawan,
25260200153,Ongki Andrean,Salma Aulia Insani,
250303000146,Dian Novita,Ronny Daeng Badjie,
25032500163,Rudiansyah ,Yuke Valency,
25032400161,Rachel Diandra Chairunnisa,muhammad rifki,
25031500160,Putry Rinjani,Nico Rahmat Fauzi,
25031700165,Melyta Hasty Dwi Andini Kharis,MOH. RAUL AMARULLAH,Devita Lesmana
25033000158,Muhammad imam Suhandi,Ronny Daeng Badjie,
25042500166,Fina septania,Ronny Daeng Badjie,
25043000177,Agung Purnama,Vira Hadist,
5052500172,SELVI RAHMANDANI,Rhesa Gunawan,
5052500174,Indri Novianti,Ronny Daeng Badjie,
25050500173,MOH. RAUL AMARULLAH,MOH. RAUL AMARULLAH,Devita Lesmana
25051400184,Nisa Afni Oktafia ,Salma Aulia Insani,
25050800016,Doni Damara,Rhesa Gunawan,
08052500176,Adestya Suci Pratiwi,Salma Aulia Insani,
13052500181,Milah Diyah Kustiyani Khairo,Ronny Daeng Badjie,
13052500183,SHERLY OKTAVIANI,Wanda Haptasari,Ronny Daeng Badjie
13052500186,ARI TEGAR RIAWAN,Agung Purnama,
25060200017,Ahmad Ansori Budiaji,Rhesa Gunawan,
25060500018,Achmad Rizali,Rhesa Gunawan,
25061200019,M Zaky Abdillah,Rhesa Gunawan,
25061600214,Agung Septa Wijaya,Agung Purnama,
25062400233,SEPTIANA,Rhesa Gunawan,
25060900205,RIFKA SYIFA ZAKIYA,Bagas Ikhwan Muharram,
25062600223,Vidya Shevina,MOH. RAUL AMARULLAH,Devita Lesmana
25060900208,Faizah Nur Hasanah,Bagas Ikhwan Muharram,
25060900210,RM Syauqi Soeryohananto,Agung Purnama,
25061600215,RUSNIAWATI,Salma Aulia Insani,
25062300215,Asharianto,Rhesa Gunawan,
25060900220,Muhammad Firdaus,muhammad rifki,
25060900222,Rizki Rufi Sabila,muhammad rifki,
25070400227,Nur Chotimah,Salma Aulia Insani,
25070100224,Zulfikri Yarahman,muhammad rifki,
25072800238,Muhamad Denies Nurrohman,Agung Purnama,
25070800231,muhammad rifki,muhammad rifki,
25070400228,MUHAMAD TEGAR,Salma Aulia Insani,
25072100236,Peralihan Talenta Aurora Nz,Salma Aulia Insani,
25070800230,Muhammad Arsya Fahrezi,muhammad rifki,
25071400234,RIANTY OCTAVIANA DJAMI,Ronny Daeng Badjie,
25080400242,Antonius Oscar Pascale Aditya Syahputra,muhammad rifki,
25072800240,Gaudentio Oriensu Dioktokusuma,muhammad rifki,
25081800247,Nadilla,Salma Aulia Insani,
25072800241,Asyuni Simanjuntak,MOH. RAUL AMARULLAH,Devita Lesmana
25090800250,Vira Mutiara Hadits,Andy Lesmana,
25090800251,Sarah Muthia Rahma,Thalia Vernanda,
25082700248,Dwi ratu andika rahayu,Salma Aulia Insani,
25090800252,Elza Mourine Clarista,Sandy,Novi Atien Purwana Putri
25150900269,Hiskia Sinaga,Rhesa Gunawan,
25082700020,Yusuf Hannanto Wibowo,Rhesa Gunawan,
25090100021,Dedi,Rhesa Gunawan,
25102000259,Maryatun,Ronny Daeng Badjie,
25102700260,Devita Lesmana Teng,Andy Lesmana,
25110300264,Setiani Purnama Dewi,Salma Aulia Insani,
25110100265,Rahayu prasetyaning Wulandari,Ronny Daeng Badjie,
25111000268,Randi Apriyansyah,Nico Rahmat Fauzi,
25092500022,Tarono,Sandy,Novi Atien Purwana Putri
24060100023,Warsito,Sandy,Novi Atien Purwana Putri
24060100024,Muis,Rhesa Gunawan,
24060100025,Agus,Rhesa Gunawan,
24060100026,Agung Hakiki,Rhesa Gunawan,
24060100027,Anggi Wahyudin,Rhesa Gunawan,
24060100028,Sandy,Novi Atien Purwana Putri,
24060100029,Rhesa Gunawan,Rhesa Gunawan,
24060100030,Suhibi,Rhesa Gunawan,
24060100031,Suharjo,Rhesa Gunawan,
24060100032,Zaeni,Rhesa Gunawan,
24060100033,Eniseventina Giawa,Rhesa Gunawan,
24060100034,Sofyan Hadi,Sandy,Novi Atien Purwana Putri
25112100035,Ridho Adi Setiawan,Rhesa Gunawan,
25120100270,Vionna Febrianni Limiarti,Andy Lesmana,
25122900036,Rakhmat Hidayat,Sandy,Novi Atien Purwana Putri
26022500276,Michelle Sifran,Salma Aulia Insani,
26032500277,Ronny Daeng Badjie,Andy Lesmana,
26041300037,Muhammad Baidillah,Rhesa Gunawan,
26040100038,Zakki Izza Hadirati Maulana,Rhesa Gunawan,
26042700281,Brigita Caroline Simanungkalit,Vira Hadist,
26042800283,Riska Rustiani,Nico Rahmat Fauzi,
26051100285,Yolanda Septifani Purba,Salma Aulia Insani,
26050600284,Mega Putri Wijaya,Salma Aulia Insani,
26062200293,Fadhilah,Vira Hadist,
26060200288,FETY SUSIANI,Ronny Daeng Badjie,
26060200289,Yani hardianti,Ronny Daeng Badjie,
26061500296,Yulian Agung Setia ,Ronny Daeng Badjie,
26061500297,SRI DEWI MANDALIKA ,Ronny Daeng Badjie,
26061000291,Rizka Fitriani ,Salma Aulia Insani,
26061800292,Nadya Analinta ,Ronny Daeng Badjie,
26062600294,Arif Rahmat Abdullah SE,Vira Hadist,
26062900295,Yuke Valency,Andy Lesmana,
26072300301,Alma Aprilia,Yuke Valency,
26060600298,Desviani Alyaa,Salma Aulia Insani,
26071300304,RETI KISMARINI ,Ronny Daeng Badjie,
26050400039,Itang,Rhesa Gunawan,
26050400040,Maulana Yusuf,Rhesa Gunawan,
26061700041,Muhamad Hasim Asari,Rhesa Gunawan,
26072500042,Rama Aditya Fauzi,Rhesa Gunawan,
26080800043,Iqbal Ramadhan Priatna,Rhesa Gunawan,
26080300044,Irpan,Rhesa Gunawan,
26060600299,Lintang Afifah ,Salma Aulia Insani,
26080300045,Rindiani Sekar Arum,Salma Aulia Insani,
26080300046,Aulia laela,Salma Aulia Insani,
26080300047,Luthfia Faradila,Salma Aulia Insani,
26080400305,Marsela,Ronny Daeng Badjie,
26080300306,Eni Setiyowati,Ronny Daeng Badjie,
26080300307,ADDIS INTAN AMALIA PUTRI,Ronny Daeng Badjie,
26080300309,Serly Dauhan,Ronny Daeng Badjie,
26092100318,Romawati ,Ronny Daeng Badjie,
26081000308,Thalia Vernanda,Vira Hadist,
26083100312,Mahardhika Dwi Ananta Sofyan,Vira Hadist,
26082700310,Viona Anggraina,Vira Hadist,
26091700314,Bagas Ikhwan Muharram,Arif Rahmat Abdullah SE,
26092100048,YOLANDA DWI PUTRI,Ronny Daeng Badjie,
26092100316,Aztrio Ridho Anugrah  ,Ronny Daeng Badjie,
26092100317,ARIES MARGIANTO,Yuke Valency,
26092100315,Salma Aulia Insani,Andy Lesmana,
26100500175,Galang Alfiyansyah,Mahardhika Dwi Ananta Sofyan,
26100500174,Femmy Isnawati,Thalia Vernanda,
26101200177,Windy Putri Iryanto,Novi Atien Purwana Putri,
26100700320,Devan Widiananda Rachman,Vira Hadist,`;

async function main() {
  const employees = await prisma.employee.findMany();
  const empMap = new Map();
  employees.forEach(e => {
    empMap.set(e.name.toLowerCase().trim(), e);
  });

  const ALIASES = {
    'devita lesmana': 'devita lesmana teng',
    'vira hadist': 'vira mutiara hadits',
  };

  const resolveApprover = (name) => {
    if (!name || !name.trim()) return null;
    const clean = name.toLowerCase().trim();
    if (empMap.has(clean)) return empMap.get(clean);
    const alias = ALIASES[clean];
    if (alias && empMap.has(alias)) return empMap.get(alias);
    if (clean === 'andy lesmana') return { id: -1, name: 'Andy Lesmana' };
    return null;
  };

  const lines = csvData.trim().split('\n').slice(1);
  const items = [];

  for (const line of lines) {
    const parts = line.split(',');
    const csvId = parts[0]?.trim();
    const name = parts[1]?.trim();
    const app1Name = parts[2]?.trim();
    const app2Name = parts[3]?.trim();

    const emp = empMap.get(name.toLowerCase());
    if (!emp) {
      console.warn('Missing emp:', name);
      continue;
    }

    const app1 = resolveApprover(app1Name);
    const app2 = resolveApprover(app2Name);

    const matrix = [];
    if (app1) {
      matrix.push({
        level: 1,
        employeeId: app1.id,
        label: app1.id === -1 ? 'Approval 1 (Direktur)' : 'Approval 1 (Operasional)',
      });
    }
    if (app2 && app2.id !== app1?.id) {
      matrix.push({
        level: 2,
        employeeId: app2.id,
        label: 'Approval 2 (Manager)',
      });
    }

    items.push({
      employeeId: emp.id,
      csvId,
      managerId: app1 ? app1.id : null,
      approver1Id: app1 ? app1.id : null,
      approver2Id: app2 ? app2.id : null,
      approvalMatrix: matrix,
    });
  }

  console.log(`Prepared ${items.length} items to send to API.`);

  // Call API
  const res = await fetch('http://localhost:3000/api/employees/bulk-approval-matrix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      autoCreateDirector: true,
      updateNik: false,
      items,
    }),
  });

  const json = await res.json();
  console.log('API Response:', json);

  // Verification queries
  const gerry = await prisma.employee.findFirst({
    where: { name: 'Gerry Krisnandi' },
    select: { id: true, name: true, managerId: true, approver1Id: true, approver2Id: true, approvalMatrix: true }
  });
  console.log('\nVerified Gerry Krisnandi:', gerry);

  const tan = await prisma.employee.findFirst({
    where: { name: 'Tan Sui Lian' },
    select: { id: true, name: true, managerId: true, approver1Id: true, approver2Id: true, approvalMatrix: true }
  });
  console.log('Verified Tan Sui Lian:', tan);

  const vira = await prisma.employee.findFirst({
    where: { name: 'Vira Mutiara Hadits' },
    select: { id: true, name: true, managerId: true, approver1Id: true, approver2Id: true, approvalMatrix: true }
  });
  console.log('Verified Vira Mutiara Hadits (Director Approver):', vira);

  const andy = await prisma.employee.findFirst({
    where: { name: 'Andy Lesmana' },
    select: { id: true, name: true, dept: true, jobPosition: true, role: true }
  });
  console.log('Verified Andy Lesmana:', andy);
}

main().catch(console.error).finally(() => prisma.$disconnect());
