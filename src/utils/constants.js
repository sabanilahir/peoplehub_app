// Shared LOV constants — kept here so they're not duplicated across pages

export const EMP_TYPES   = ['Permanent','Contract','Outsource','Internship']
export const RELIGIONS   = ['Islam','Kristen','Katolik','Hindu','Buddha','Konghucu','Lainnya']
export const EDU_LEVELS  = ['SD','SMP','SMA/SMK','D1','D2','D3','D4','S1','S2','S3']
export const SKILL_LVLS  = ['Beginner','Intermediate','Advanced','Expert']
export const GENDERS     = ['Male','Female']
export const MARITAL     = ['Single','Married','Divorced','Widowed']
export const BLOOD_TYPES = ['A','B','AB','O']
export const TAX_STATUS  = ['TK','K0','M1','M2','M3']
export const RELS        = ['Spouse','Child','Parent','Sibling','Other']
export const CURRENCY_LOV = ['PHP','USD','SGD','HKD','JPY','EUR','GBP','AUD']

export const COUNTRIES = [
  'Indonesia','Malaysia','Singapore','Thailand','Philippines','Vietnam','Myanmar',
  'Cambodia','Laos','Brunei Darussalam','Timor-Leste',
  'India','Bangladesh','Pakistan','Sri Lanka','Nepal','Bhutan','Maldives','Afghanistan',
]

export const CITIES = [
  'Jakarta','Surabaya','Bandung','Semarang','Yogyakarta','Solo','Malang','Bekasi','Depok',
  'Tangerang','South Tangerang','Bogor','Cirebon','Sukabumi','Purwakarta','Karawang',
  'Tasikmalaya','Purwokerto','Tegal','Pekalongan','Madiun','Kediri','Blitar','Mojokerto',
  'Jember','Banyuwangi','Pasuruan','Probolinggo','Sidoarjo','Gresik',
  'Medan','Palembang','Pekanbaru','Padang','Bandar Lampung','Batam','Jambi','Banda Aceh',
  'Binjai','Sibolga','Bukittinggi','Bengkulu','Pangkal Pinang','Tanjung Pinang',
  'Balikpapan','Samarinda','Banjarmasin','Pontianak','Palangkaraya',
  'Makassar','Manado','Palu','Kendari','Gorontalo','Mamuju',
  'Denpasar','Mataram','Kupang',
  'Ambon','Ternate','Jayapura','Sorong','Manokwari',
  'Singapore','Kuala Lumpur','Bangkok','Ho Chi Minh City','Manila','Tokyo','Seoul',
  'Beijing','Shanghai','Sydney','Melbourne','London','Amsterdam','Dubai','Riyadh',
  'New York','Los Angeles','Other',
]

export const WORK_LOCATIONS = ['Head Office', 'Gudang', 'Manhattan', 'Others']

export const EMPTY_EMP = {
  nik:'', name:'', gender:'Male', birthPlace:'', birthDate:'', nationality:'Indonesian',
  religion:'Islam', maritalStatus:'Single', bloodType:'', taxStatus:'', ktp:'', npwp:'',
  bpjs:'', phone:'', email:'', personalEmail:'', address:'', city:'', country:'Indonesia',
  location: 'Head Office', workLocationCode: 'ho',
  photo:null, status:'Active', employmentType:'Permanent',
  joinDate:'', endDate:'', role:'employee',
  companyId:'', divisionId:'', businessUnitId:'', departmentId:'', positionId:'',
  gradeId:'', individualClassId:'',
  currency:'', basicSalary:'', salaryAdjustment:'', promotionAllowance:'',
  meals:'', communication:'', gasCard:'', tollAndParking:'', medical:'',
}
