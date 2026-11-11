import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// Raw 154 data baris dari user
const RAW_DATA = [
  { no: 1, id: "23090100005", name: "Tan Sui Lian", atasan: "Devita Lesmana Teng", app1: "MOH. RAUL AMARULLAH", app2: "Devita Lesmana" },
  { no: 2, id: "23090100013", name: "Nurcahya Sakti", atasan: "Novi Atien Purwana Putri", app1: "Sandy", app2: "Novi Atien Purwana Putri" },
  { no: 3, id: "23091500014", name: "Imam Mustadi", atasan: "Novi Atien Purwana Putri", app1: "Sandy", app2: "Novi Atien Purwana Putri" },
  { no: 4, id: "23091500015", name: "Tino Pratama", atasan: "Novi Atien Purwana Putri", app1: "Sandy", app2: "Novi Atien Purwana Putri" },
  { no: 5, id: "23126000001", name: "Muhammad Naufal Syauqii", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 6, id: "23121100033", name: "Valena Revelin", atasan: "Devan Widiananda Rachman", app1: "Devan Widiananda Rachman", app2: "" },
  { no: 7, id: "24010300048", name: "Agusto Hendrik Fernando", atasan: "Salma Aulia Insani", app1: "Salma Aulia Insani", app2: "" },
  { no: 8, id: "24223000002", name: "Muhamad Andri Saputra", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 9, id: "24223000003", name: "Alfitra Swary Fachreza", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 10, id: "24409000004", name: "Panut Al Bashir", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 11, id: "24041600005", name: "Didih Murodi", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 12, id: "24041600083", name: "Cindy Herawati", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 13, id: "24041600084", name: "Rizki Mulyono", atasan: "Salma Aulia Insani", app1: "Salma Aulia Insani", app2: "" },
  { no: 14, id: "24061900091", name: "Muhammad Aryansyah", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 15, id: "24060600006", name: "Tajul", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 16, id: "24061900096", name: "Juhenah", atasan: "Salma Aulia Insani", app1: "Salma Aulia Insani", app2: "" },
  { no: 17, id: "24061900098", name: "Nico Rahmat Fauzi", atasan: "Ronny Daeng Badjie", app1: "Andy Lesmana", app2: "" },
  { no: 18, id: "24072900007", name: "Ismail", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 19, id: "24072700100", name: "Tika Fitriyah Dewi", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 20, id: "24072900008", name: "Daniel", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 21, id: "24072900009", name: "Hasan", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 22, id: "24090200104", name: "Novi Atien Purwana Putri", atasan: "Andy Lesmana", app1: "Andy Lesmana", app2: "" },
  { no: 23, id: "24011100110", name: "Dian Rosnawaty", atasan: "Ronny Daeng Badjie", app1: "Ronny Daeng Badjie", app2: "" },
  { no: 24, id: "24102100111", name: "Rini Indriani", atasan: "Ronny Daeng Badjie", app1: "Ronny Daeng Badjie", app2: "" },
  { no: 25, id: "24111200010", name: "Sarta", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 26, id: "24111400011", name: "Pirlo Wan Saliem", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 27, id: "24112600124", name: "Dwi Widna Zhazanty", atasan: "Salma Aulia Insani", app1: "Salma Aulia Insani", app2: "" },
  { no: 28, id: "24114200126", name: "Anne Marliane T.R", atasan: "Agung Purnama", app1: "Agung Purnama", app2: "" },
  { no: 29, id: "24115800128", name: "Ayu Fitriana Anjarwati", atasan: "Nico Rahmat Fauzi", app1: "Nico Rahmat Fauzi", app2: "" },
  { no: 30, id: "25022600012", name: "UTARY PRAMESTI RAHAYU", atasan: "Salma Aulia Insani", app1: "Salma Aulia Insani", app2: "" },
  { no: 31, id: "250224000142", name: "Noel Jeconiah Janitra Setjo", atasan: "Devan Widiananda Rachman", app1: "Devan Widiananda Rachman", app2: "" },
  { no: 32, id: "250224000143", name: "Gerry Krisnandi", atasan: "muhammad rifki", app1: "muhammad rifki", app2: "" },
  { no: 33, id: "25030500154", name: "Wanda Haptasari", atasan: "Ronny Daeng Badjie", app1: "Ronny Daeng Badjie", app2: "" },
  { no: 34, id: "25030500013", name: "Andhika Agil Prasetya", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 35, id: "25030500014", name: "Maulana Malik Ibrahim", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 36, id: "25031000015", name: "Andre Ferdiansyah", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 37, id: "25260200153", name: "Ongki Andrean", atasan: "Salma Aulia Insani", app1: "Salma Aulia Insani", app2: "" },
  { no: 38, id: "250303000146", name: "Dian Novita", atasan: "Ronny Daeng Badjie", app1: "Ronny Daeng Badjie", app2: "" },
  { no: 39, id: "25032500163", name: "Rudiansyah", atasan: "Yuke Valency", app1: "Yuke Valency", app2: "" },
  { no: 40, id: "25032400161", name: "Rachel Diandra Chairunnisa", atasan: "muhammad rifki", app1: "muhammad rifki", app2: "" },
  { no: 41, id: "25031500160", name: "Putry Rinjani", atasan: "Nico Rahmat Fauzi", app1: "Nico Rahmat Fauzi", app2: "" },
  { no: 42, id: "25031700165", name: "Melyta Hasty Dwi Andini Kharis", atasan: "Devita Lesmana Teng", app1: "MOH. RAUL AMARULLAH", app2: "Devita Lesmana" },
  { no: 43, id: "25033000158", name: "Muhammad imam Suhandi", atasan: "Ronny Daeng Badjie", app1: "Ronny Daeng Badjie", app2: "" },
  { no: 44, id: "25042500166", name: "Fina septania", atasan: "Ronny Daeng Badjie", app1: "Ronny Daeng Badjie", app2: "" },
  { no: 45, id: "25043000177", name: "Agung Purnama", atasan: "Vira Mutiara Hadits", app1: "Vira Hadist", app2: "" },
  { no: 46, id: "5052500172", name: "SELVI RAHMANDANI", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 47, id: "5052500174", name: "Indri Novianti", atasan: "Ronny Daeng Badjie", app1: "Ronny Daeng Badjie", app2: "" },
  { no: 48, id: "25050500173", name: "MOH. RAUL AMARULLAH", atasan: "Devita Lesmana Teng", app1: "MOH. RAUL AMARULLAH", app2: "Devita Lesmana" },
  { no: 49, id: "25051400184", name: "Nisa Afni Oktafia", atasan: "Salma Aulia Insani", app1: "Salma Aulia Insani", app2: "" },
  { no: 50, id: "25050800016", name: "Doni Damara", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 51, id: "08052500176", name: "Adestya Suci Pratiwi", atasan: "Salma Aulia Insani", app1: "Salma Aulia Insani", app2: "" },
  { no: 52, id: "13052500181", name: "Milah Diyah Kustiyani Khairo", atasan: "Ronny Daeng Badjie", app1: "Ronny Daeng Badjie", app2: "" },
  { no: 53, id: "13052500183", name: "SHERLY OKTAVIANI", atasan: "Wanda Haptasari", app1: "Wanda Haptasari", app2: "Ronny Daeng Badjie" },
  { no: 54, id: "13052500186", name: "ARI TEGAR RIAWAN", atasan: "Agung Purnama", app1: "Agung Purnama", app2: "" },
  { no: 55, id: "25060200017", name: "Ahmad Ansori Budiaji", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 56, id: "25060500018", name: "Achmad Rizali", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 57, id: "25061200019", name: "M Zaky Abdillah", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 58, id: "25061600214", name: "Agung Septa Wijaya", atasan: "Agung Purnama", app1: "Agung Purnama", app2: "" },
  { no: 59, id: "25062400233", name: "SEPTIANA", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 60, id: "25060900205", name: "RIFKA SYIFA ZAKIYA", atasan: "Bagas Ikhwan Muharram", app1: "Bagas Ikhwan Muharram", app2: "" },
  { no: 61, id: "25062600223", name: "Vidya Shevina", atasan: "Devita Lesmana Teng", app1: "MOH. RAUL AMARULLAH", app2: "Devita Lesmana" },
  { no: 62, id: "25060900208", name: "Faizah Nur Hasanah", atasan: "Bagas Ikhwan Muharram", app1: "Bagas Ikhwan Muharram", app2: "" },
  { no: 63, id: "25060900210", name: "RM Syauqi Soeryohananto", atasan: "Agung Purnama", app1: "Agung Purnama", app2: "" },
  { no: 64, id: "25061600215", name: "RUSNIAWATI", atasan: "Salma Aulia Insani", app1: "Salma Aulia Insani", app2: "" },
  { no: 65, id: "25062300215", name: "Asharianto", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 66, id: "25060900220", name: "Muhammad Firdaus", atasan: "muhammad rifki", app1: "muhammad rifki", app2: "" },
  { no: 67, id: "25060900222", name: "Rizki Rufi Sabila", atasan: "muhammad rifki", app1: "muhammad rifki", app2: "" },
  { no: 68, id: "25070400227", name: "Nur Chotimah", atasan: "Salma Aulia Insani", app1: "Salma Aulia Insani", app2: "" },
  { no: 69, id: "25070100224", name: "Zulfikri Yarahman", atasan: "muhammad rifki", app1: "muhammad rifki", app2: "" },
  { no: 70, id: "25072800238", name: "Muhamad Denies Nurrohman", atasan: "Agung Purnama", app1: "Agung Purnama", app2: "" },
  { no: 71, id: "25070800231", name: "muhammad rifki", atasan: "muhammad rifki", app1: "muhammad rifki", app2: "" },
  { no: 72, id: "25070400228", name: "MUHAMAD TEGAR", atasan: "Salma Aulia Insani", app1: "Salma Aulia Insani", app2: "" },
  { no: 73, id: "25072100236", name: "Peralihan Talenta Aurora Nz", atasan: "Salma Aulia Insani", app1: "Salma Aulia Insani", app2: "" },
  { no: 74, id: "25070800230", name: "Muhammad Arsya Fahrezi", atasan: "muhammad rifki", app1: "muhammad rifki", app2: "" },
  { no: 75, id: "25071400234", name: "RIANTY OCTAVIANA DJAMI", atasan: "Ronny Daeng Badjie", app1: "Ronny Daeng Badjie", app2: "" },
  { no: 76, id: "25080400242", name: "Antonius Oscar Pascale Aditya Syahputra", atasan: "muhammad rifki", app1: "muhammad rifki", app2: "" },
  { no: 77, id: "25072800240", name: "Gaudentio Oriensu Dioktokusuma", atasan: "muhammad rifki", app1: "muhammad rifki", app2: "" },
  { no: 78, id: "25081800247", name: "Nadilla", atasan: "Salma Aulia Insani", app1: "Salma Aulia Insani", app2: "" },
  { no: 79, id: "25072800241", name: "Asyuni Simanjuntak", atasan: "Devita Lesmana Teng", app1: "MOH. RAUL AMARULLAH", app2: "Devita Lesmana" },
  { no: 80, id: "25090800250", name: "Vira Mutiara Hadits", atasan: "Andy Lesmana", app1: "Andy Lesmana", app2: "" },
  { no: 81, id: "25090800251", name: "Sarah Muthia Rahma", atasan: "Thalia Vernanda", app1: "Thalia Vernanda", app2: "" },
  { no: 82, id: "25082700248", name: "Dwi ratu andika rahayu", atasan: "Salma Aulia Insani", app1: "Salma Aulia Insani", app2: "" },
  { no: 83, id: "25090800252", name: "Elza Mourine Clarista", atasan: "Novi Atien Purwana Putri", app1: "Sandy", app2: "Novi Atien Purwana Putri" },
  { no: 84, id: "25150900269", name: "Hiskia Sinaga", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 85, id: "25082700020", name: "Yusuf Hannanto Wibowo", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 86, id: "25090100021", name: "Dedi", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 87, id: "25102000259", name: "Maryatun", atasan: "Ronny Daeng Badjie", app1: "Ronny Daeng Badjie", app2: "" },
  { no: 88, id: "25102700260", name: "Devita Lesmana Teng", atasan: "Andy Lesmana", app1: "Andy Lesmana", app2: "" },
  { no: 89, id: "25110300264", name: "Setiani Purnama Dewi", atasan: "Salma Aulia Insani", app1: "Salma Aulia Insani", app2: "" },
  { no: 90, id: "25110100265", name: "Rahayu prasetyaning Wulandari", atasan: "Ronny Daeng Badjie", app1: "Ronny Daeng Badjie", app2: "" },
  { no: 91, id: "25111000268", name: "Randi Apriyansyah", atasan: "Nico Rahmat Fauzi", app1: "Nico Rahmat Fauzi", app2: "" },
  { no: 92, id: "25092500022", name: "Tarono", atasan: "Novi Atien Purwana Putri", app1: "Sandy", app2: "Novi Atien Purwana Putri" },
  { no: 93, id: "24060100023", name: "Warsito", atasan: "Novi Atien Purwana Putri", app1: "Sandy", app2: "Novi Atien Purwana Putri" },
  { no: 94, id: "24060100024", name: "Muis", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 95, id: "24060100025", name: "Agus", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 96, id: "24060100026", name: "Agung Hakiki", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 97, id: "24060100027", name: "Anggi Wahyudin", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 98, id: "24060100028", name: "Sandy", atasan: "Novi Atien Purwana Putri", app1: "Novi Atien Purwana Putri", app2: "" },
  { no: 99, id: "24060100029", name: "Rhesa Gunawan", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 100, id: "24060100030", name: "Suhibi", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 101, id: "24060100031", name: "Suharjo", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 102, id: "24060100032", name: "Zaeni", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 103, id: "24060100033", name: "Eniseventina Giawa", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 104, id: "24060100034", name: "Sofyan Hadi", atasan: "Novi Atien Purwana Putri", app1: "Sandy", app2: "Novi Atien Purwana Putri" },
  { no: 105, id: "25112100035", name: "Ridho Adi Setiawan", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 106, id: "25120100270", name: "Vionna Febrianni Limiarti", atasan: "Andy Lesmana", app1: "Andy Lesmana", app2: "" },
  { no: 107, id: "25122900036", name: "Rakhmat Hidayat", atasan: "Novi Atien Purwana Putri", app1: "Sandy", app2: "Novi Atien Purwana Putri" },
  { no: 108, id: "26022500276", name: "Michelle Sifran", atasan: "Salma Aulia Insani", app1: "Salma Aulia Insani", app2: "" },
  { no: 109, id: "26032500277", name: "Ronny Daeng Badjie", atasan: "Andy Lesmana", app1: "Andy Lesmana", app2: "" },
  { no: 110, id: "26041300037", name: "Muhammad Baidillah", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 111, id: "26040100038", name: "Zakki Izza Hadirati Maulana", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 112, id: "26042700281", name: "Brigita Caroline Simanungkalit", atasan: "Vira Mutiara Hadits", app1: "Vira Hadist", app2: "" },
  { no: 113, id: "26042800283", name: "Riska Rustiani", atasan: "Nico Rahmat Fauzi", app1: "Nico Rahmat Fauzi", app2: "" },
  { no: 114, id: "26051100285", name: "Yolanda Septifani Purba", atasan: "Salma Aulia Insani", app1: "Salma Aulia Insani", app2: "" },
  { no: 115, id: "26050600284", name: "Mega Putri Wijaya", atasan: "Salma Aulia Insani", app1: "Salma Aulia Insani", app2: "" },
  { no: 116, id: "26062200293", name: "Fadhilah", atasan: "Vira Mutiara Hadits", app1: "Vira Hadist", app2: "" },
  { no: 117, id: "26060200288", name: "FETY SUSIANI", atasan: "Ronny Daeng Badjie", app1: "Ronny Daeng Badjie", app2: "" },
  { no: 118, id: "26060200289", name: "Yani hardianti", atasan: "Ronny Daeng Badjie", app1: "Ronny Daeng Badjie", app2: "" },
  { no: 119, id: "26061500296", name: "Yulian Agung Setia", atasan: "Ronny Daeng Badjie", app1: "Ronny Daeng Badjie", app2: "" },
  { no: 120, id: "26061500297", name: "SRI DEWI MANDALIKA", atasan: "Ronny Daeng Badjie", app1: "Ronny Daeng Badjie", app2: "" },
  { no: 121, id: "26061000291", name: "Rizka Fitriani", atasan: "Salma Aulia Insani", app1: "Salma Aulia Insani", app2: "" },
  { no: 122, id: "26061800292", name: "Nadya Analinta", atasan: "Ronny Daeng Badjie", app1: "Ronny Daeng Badjie", app2: "" },
  { no: 123, id: "26062600294", name: "Arif Rahmat Abdullah SE", atasan: "Vira Mutiara Hadits", app1: "Vira Hadist", app2: "" },
  { no: 124, id: "26062900295", name: "Yuke Valency", atasan: "Andy Lesmana", app1: "Andy Lesmana", app2: "" },
  { no: 125, id: "26072300301", name: "Alma Aprilia", atasan: "Yuke Valency", app1: "Yuke Valency", app2: "" },
  { no: 126, id: "26060600298", name: "Desviani Alyaa", atasan: "Salma Aulia Insani", app1: "Salma Aulia Insani", app2: "" },
  { no: 127, id: "26071300304", name: "RETI KISMARINI", atasan: "Ronny Daeng Badjie", app1: "Ronny Daeng Badjie", app2: "" },
  { no: 128, id: "26050400039", name: "Itang", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 129, id: "26050400040", name: "Maulana Yusuf", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 130, id: "26061700041", name: "Muhamad Hasim Asari", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 131, id: "26072500042", name: "Rama Aditya Fauzi", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 132, id: "26080800043", name: "Iqbal Ramadhan Priatna", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 133, id: "26080300044", name: "Irpan", atasan: "Rhesa Gunawan", app1: "Rhesa Gunawan", app2: "" },
  { no: 134, id: "26060600299", name: "Lintang Afifah", atasan: "Salma Aulia Insani", app1: "Salma Aulia Insani", app2: "" },
  { no: 135, id: "26080300045", name: "Rindiani Sekar Arum", atasan: "Salma Aulia Insani", app1: "Salma Aulia Insani", app2: "" },
  { no: 136, id: "26080300046", name: "Aulia laela", atasan: "Salma Aulia Insani", app1: "Salma Aulia Insani", app2: "" },
  { no: 137, id: "26080300047", name: "Luthfia Faradila", atasan: "Salma Aulia Insani", app1: "Salma Aulia Insani", app2: "" },
  { no: 138, id: "26080400305", name: "Marsela", atasan: "Ronny Daeng Badjie", app1: "Ronny Daeng Badjie", app2: "" },
  { no: 139, id: "26080300306", name: "Eni Setiyowati", atasan: "Ronny Daeng Badjie", app1: "Ronny Daeng Badjie", app2: "" },
  { no: 140, id: "26080300307", name: "ADDIS INTAN AMALIA PUTRI", atasan: "Ronny Daeng Badjie", app1: "Ronny Daeng Badjie", app2: "" },
  { no: 141, id: "26080300309", name: "Serly Dauhan", atasan: "Ronny Daeng Badjie", app1: "Ronny Daeng Badjie", app2: "" },
  { no: 142, id: "26092100318", name: "Romawati", atasan: "Ronny Daeng Badjie", app1: "Ronny Daeng Badjie", app2: "" },
  { no: 143, id: "26081000308", name: "Thalia Vernanda", atasan: "Vira Mutiara Hadits", app1: "Vira Hadist", app2: "" },
  { no: 144, id: "26083100312", name: "Mahardhika Dwi Ananta Sofyan", atasan: "Vira Mutiara Hadits", app1: "Vira Hadist", app2: "" },
  { no: 145, id: "26082700310", name: "Viona Anggraina", atasan: "Vira Mutiara Hadits", app1: "Vira Hadist", app2: "" },
  { no: 146, id: "26091700314", name: "Bagas Ikhwan Muharram", atasan: "Arif Rahmat Abdullah SE", app1: "Arif Rahmat Abdullah SE", app2: "" },
  { no: 147, id: "26092100048", name: "YOLANDA DWI PUTRI", atasan: "Ronny Daeng Badjie", app1: "Ronny Daeng Badjie", app2: "" },
  { no: 148, id: "26092100316", name: "Aztrio Ridho Anugrah", atasan: "Ronny Daeng Badjie", app1: "Ronny Daeng Badjie", app2: "" },
  { no: 149, id: "26092100317", name: "ARIES MARGIANTO", atasan: "Yuke Valency", app1: "Yuke Valency", app2: "" },
  { no: 150, id: "26092100315", name: "Salma Aulia Insani", atasan: "Arif Rahmat Abdullah SE", app1: "Andy Lesmana", app2: "" },
  { no: 151, id: "26100500175", name: "Galang Alfiyansyah", atasan: "Mahardhika Dwi Ananta Sofyan", app1: "Mahardhika Dwi Ananta Sofyan", app2: "" },
  { no: 152, id: "26100500174", name: "Femmy Isnawati", atasan: "Thalia Vernanda", app1: "Thalia Vernanda", app2: "" },
  { no: 153, id: "26101200177", name: "Windy Putri Iryanto", atasan: "Novi Atien Purwana Putri", app1: "Novi Atien Purwana Putri", app2: "" },
  { no: 154, id: "26100700320", name: "Devan Widiananda Rachman", atasan: "Vira Mutiara Hadits", app1: "Vira Hadist", app2: "" }
]

// Normalizer nama untuk pencocokan toleran
function norm(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

async function main() {
  console.log('=== MEMULAI SINKRONISASI HIERARKI 154 KARYAWAN (DATA ODOO TIDAK DIUBAH) ===')

  // Ambil seluruh data karyawan dari PostgreSQL VPS
  const allEmployees = await prisma.employee.findMany()
  console.log(`Ditemukan ${allEmployees.length} karyawan di database PostgreSQL.`)

  // Cache pencarian PIC
  function findEmployeeByName(searchName) {
    if (!searchName || !searchName.trim()) return null
    const sNorm = norm(searchName)

    // Alias khusus nama panggilan / penulisan singkat
    if (sNorm.includes('virahadist') || sNorm.includes('viramutiara')) {
      const match = allEmployees.find(e => norm(e.name).includes('viramutiara'))
      if (match) return match
    }
    if (sNorm === 'sandy') {
      const match = allEmployees.find(e => norm(e.name) === 'sandy' || norm(e.name).startsWith('sandy'))
      if (match) return match
    }
    if (sNorm.includes('andylesmana')) {
      const match = allEmployees.find(e => norm(e.name).includes('andylesmana'))
      if (match) return match
    }
    if (sNorm.includes('devitalesmana')) {
      const match = allEmployees.find(e => norm(e.name).includes('devitalesmana'))
      if (match) return match
    }
    if (sNorm.includes('noviatien')) {
      const match = allEmployees.find(e => norm(e.name).includes('noviatien'))
      if (match) return match
    }
    if (sNorm.includes('ronnydaeng') || sNorm.includes('ronnybadjie')) {
      const match = allEmployees.find(e => norm(e.name).includes('ronny'))
      if (match) return match
    }
    if (sNorm.includes('muhammadrifki') || sNorm.includes('rifki')) {
      const match = allEmployees.find(e => norm(e.name).includes('rifki'))
      if (match) return match
    }

    // Exact match normalized
    let found = allEmployees.find(e => norm(e.name) === sNorm)
    if (found) return found

    // Contains match
    found = allEmployees.find(e => norm(e.name).includes(sNorm) || sNorm.includes(norm(e.name)))
    return found || null
  }

  let updatedCount = 0
  let skippedCount = 0

  for (const item of RAW_DATA) {
    // 1. Temukan karyawan pemohon di DB
    const empNorm = norm(item.name)
    let emp = allEmployees.find(e => norm(e.name) === empNorm)
    if (!emp) {
      emp = allEmployees.find(e => norm(e.name).includes(empNorm) || empNorm.includes(norm(e.name)))
    }

    if (!emp) {
      console.warn(`[SKIP] Karyawan tidak ditemukan di DB: #${item.no} ${item.name}`)
      skippedCount++
      continue
    }

    // 2. Resolve Atasan Langsung
    const atasanEmp = findEmployeeByName(item.atasan)
    const managerId = atasanEmp ? atasanEmp.id : emp.managerId

    // 3. Resolve Approval 1
    const app1Emp = findEmployeeByName(item.app1)
    const approver1Id = app1Emp ? app1Emp.id : managerId

    // 4. Resolve Approval 2 (null jika kosong)
    let approver2Id = null
    if (item.app2 && item.app2.trim()) {
      const app2Emp = findEmployeeByName(item.app2)
      if (app2Emp) {
        approver2Id = app2Emp.id
      }
    }

    // 5. Update HANYA managerId, approver1Id, approver2Id (TIDAK MENGUBAH jobPosition / jobTitle)
    await prisma.employee.update({
      where: { id: emp.id },
      data: {
        managerId,
        approver1Id,
        approver2Id,
      },
    })

    updatedCount++
  }

  console.log(`\n=== HASIL SINKRONISASI ===`)
  console.log(`Berhasil memperbarui hierarki approval: ${updatedCount} karyawan.`)
  console.log(`Dilewati / Belum ada di DB: ${skippedCount} karyawan.`)
  console.log(`Semua field jobPosition & jobTitle Odoo TETAP UTUH 100%.`)
}

main()
  .catch(e => {
    console.error('Error saat sinkronisasi:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
