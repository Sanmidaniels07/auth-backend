// Nigerian states and their local government areas (37 incl. FCT, 774
// LGAs), plus popular neighbourhoods and suggested delivery zones for the
// biggest cities. Used to suggest delivery zones to sellers so they don't
// type locations by hand. Generated once from a verified source and
// hand-checked; edit freely - it's plain data.

export interface SuggestedZone {
  name: string;
  areas: string[];
}

export interface StateLocations {
  name: string;
  lgas: string[];
  // Well-known neighbourhoods buyers recognise (beyond LGA names).
  popularAreas?: string[];
  // Ready-made zone groupings a seller can price in one go.
  suggestedZones?: SuggestedZone[];
}

const zone = (...areas: string[]): SuggestedZone => ({ name: areas.join(" / "), areas });

const STATES_AND_LGAS: { name: string; lgas: string[] }[] = [
  {
    "name": "Abia",
    "lgas": [
      "Aba North",
      "Aba South",
      "Arochukwu",
      "Bende",
      "Ikwuano",
      "Isiala Ngwa North",
      "Isiala Ngwa South",
      "Isuikwuato",
      "Obi Ngwa",
      "Ohafia",
      "Osisioma",
      "Ugwunagbo",
      "Ukwa East",
      "Ukwa West",
      "Umuahia North",
      "Umuahia South",
      "Umu Nneochi"
    ]
  },
  {
    "name": "Adamawa",
    "lgas": [
      "Demsa",
      "Fufure",
      "Ganye",
      "Gayuk",
      "Girei",
      "Gombi",
      "Hong",
      "Jada",
      "Lamurde",
      "Madagali",
      "Maiha",
      "Mayo Belwa",
      "Michika",
      "Mubi North",
      "Mubi South",
      "Numan",
      "Shelleng",
      "Song",
      "Toungo",
      "Yola North",
      "Yola South"
    ]
  },
  {
    "name": "Akwa Ibom",
    "lgas": [
      "Abak",
      "Eastern Obolo",
      "Eket",
      "Esit Eket",
      "Essien Udim",
      "Etim Ekpo",
      "Etinan",
      "Ibeno",
      "Ibesikpo Asutan",
      "Ibiono-Ibom",
      "Ika",
      "Ikono",
      "Ikot Abasi",
      "Ikot Ekpene",
      "Ini",
      "Itu",
      "Mbo",
      "Mkpat-Enin",
      "Nsit-Atai",
      "Nsit-Ibom",
      "Nsit-Ubium",
      "Obot Akara",
      "Okobo",
      "Onna",
      "Oron",
      "Oruk Anam",
      "Udung-Uko",
      "Ukanafun",
      "Uruan",
      "Urue-Offong/Oruko",
      "Uyo"
    ]
  },
  {
    "name": "Anambra",
    "lgas": [
      "Aguata",
      "Anambra East",
      "Anambra West",
      "Anaocha",
      "Awka North",
      "Awka South",
      "Ayamelum",
      "Dunukofia",
      "Ekwusigo",
      "Idemili North",
      "Idemili South",
      "Ihiala",
      "Njikoka",
      "Nnewi North",
      "Nnewi South",
      "Ogbaru",
      "Onitsha North",
      "Onitsha South",
      "Orumba North",
      "Orumba South",
      "Oyi"
    ]
  },
  {
    "name": "Bauchi",
    "lgas": [
      "Alkaleri",
      "Bauchi",
      "Bogoro",
      "Damban",
      "Darazo",
      "Dass",
      "Gamawa",
      "Ganju/Ganjuwa",
      "Giade",
      "Itas/Gadau",
      "Jama'are",
      "Katagum",
      "Kirfi",
      "Misau",
      "Ningi",
      "Shira",
      "Tafawa Balewa",
      "Toro",
      "Warji",
      "Zaki"
    ]
  },
  {
    "name": "Bayelsa",
    "lgas": [
      "Brass",
      "Ekere/Ekeremor",
      "Kolokuma/Opokuma",
      "Nembe",
      "Ogbia",
      "Sagba/Sagbama",
      "Southern Ijaw",
      "Yenagoa"
    ]
  },
  {
    "name": "Benue",
    "lgas": [
      "Ado",
      "Agatu",
      "Apa",
      "Buruku",
      "Gboko",
      "Guma",
      "Gwer East",
      "Gwer West",
      "Katsina-Ala",
      "Konshisha",
      "Kwande",
      "Logo",
      "Makurdi",
      "Obi",
      "Ogbadibo",
      "Ohimini",
      "Oju",
      "Okpokwu",
      "Oturkpo",
      "Tarka",
      "Ukum",
      "Ushongo",
      "Vandeikya"
    ]
  },
  {
    "name": "Borno",
    "lgas": [
      "Abadam",
      "Askira/Uba",
      "Bama",
      "Bayo",
      "Biu",
      "Chibok",
      "Damboa",
      "Dikwa",
      "Gubio",
      "Guzamala",
      "Gwoza",
      "Hawul",
      "Jere",
      "Kaga",
      "Kala/Balge",
      "Konduga",
      "Kukawa",
      "Kwaya Kusar",
      "Mafa",
      "Magumeri",
      "Maiduguri",
      "Marte",
      "Mobbar",
      "Monguno",
      "Ngala",
      "Nganzai",
      "Shani"
    ]
  },
  {
    "name": "Cross River",
    "lgas": [
      "Abi",
      "Akamkpa",
      "Akpabuyo",
      "Bakassi",
      "Bekwarra",
      "Biase",
      "Boki",
      "Calabar Municipal",
      "Calabar South",
      "Etung",
      "Ikom",
      "Obanliku",
      "Obubra",
      "Obudu",
      "Odukpani",
      "Ogoja",
      "Yakuur",
      "Yala"
    ]
  },
  {
    "name": "Delta",
    "lgas": [
      "Aniocha North",
      "Aniocha South",
      "Bomadi",
      "Burutu",
      "Ethiope East",
      "Ethiope West",
      "Ika North East",
      "Ika South",
      "Isoko North",
      "Isoko South",
      "Ndokwa East",
      "Ndokwa West",
      "Okpe",
      "Oshimili North",
      "Oshimili South",
      "Patani",
      "Sapele",
      "Udu",
      "Ughelli North",
      "Ughelli South",
      "Ukwuani",
      "Uvwie",
      "Warri North",
      "Warri South",
      "Warri South West"
    ]
  },
  {
    "name": "Ebonyi",
    "lgas": [
      "Abakaliki",
      "Afikpo North",
      "Afikpo South",
      "Ebonyi",
      "Ezza North",
      "Ezza South",
      "Ikwo",
      "Ishielu",
      "Ivo",
      "Izzi",
      "Ohaozara",
      "Ohaukwu",
      "Onicha"
    ]
  },
  {
    "name": "Edo",
    "lgas": [
      "Akoko-Edo",
      "Egor",
      "Esan Central",
      "Esan North-East",
      "Esan South-East",
      "Esan West",
      "Etsako Central",
      "Etsako East",
      "Etsako West",
      "Igueben",
      "Ikpoba Okha",
      "Orhionmwon",
      "Oredo",
      "Ovia North-East",
      "Ovia South-West",
      "Owan East",
      "Owan West",
      "Uhunmwonde"
    ]
  },
  {
    "name": "Ekiti",
    "lgas": [
      "Ado Ekiti",
      "Efon",
      "Ekiti East",
      "Ekiti South-West",
      "Ekiti West",
      "Emure",
      "Gbonyin",
      "Ido Osi",
      "Ijero",
      "Ikere",
      "Ikole",
      "Ilejemeje",
      "Irepodun/Ifelodun",
      "Ise/Orun",
      "Moba",
      "Oye"
    ]
  },
  {
    "name": "Enugu",
    "lgas": [
      "Aninri",
      "Awgu",
      "Enugu East",
      "Enugu North",
      "Enugu South",
      "Ezeagu",
      "Igbo Etiti",
      "Igbo Eze North",
      "Igbo Eze South",
      "Isi Uzo",
      "Nkanu East",
      "Nkanu West",
      "Nsukka",
      "Oji River",
      "Udenu",
      "Udi",
      "Uzo-Uwani"
    ]
  },
  {
    "name": "Gombe",
    "lgas": [
      "Akko",
      "Balanga",
      "Billiri",
      "Dukku",
      "Funakaye",
      "Gombe",
      "Kaltungo",
      "Kwami",
      "Nafada",
      "Shongom",
      "Yamaltu/Deba"
    ]
  },
  {
    "name": "Imo",
    "lgas": [
      "Aboh Mbaise",
      "Ahiazu Mbaise",
      "Ehime Mbano",
      "Ezinihitte",
      "Ideato North",
      "Ideato South",
      "Ihitte/Uboma",
      "Ikeduru",
      "Isiala Mbano",
      "Isu",
      "Mbaitoli",
      "Ngor Okpala",
      "Njaba",
      "Nkwerre",
      "Nwangele",
      "Obowo",
      "Oguta",
      "Ohaji/Egbema",
      "Okigwe",
      "Orlu",
      "Orsu",
      "Oru East",
      "Oru West",
      "Owerri Municipal",
      "Owerri North",
      "Owerri West",
      "Unuimo"
    ]
  },
  {
    "name": "Jigawa",
    "lgas": [
      "Auyo",
      "Babura",
      "Biriniwa",
      "Birnin Kudu",
      "Buji",
      "Dutse",
      "Gagarawa",
      "Garki",
      "Gumel",
      "Guri",
      "Gwaram",
      "Gwiwa",
      "Hadejia",
      "Jahun",
      "Kafin Hausa",
      "Kaugama",
      "Kazaure",
      "Kiri Kasama",
      "Kiyawa",
      "Maigatari",
      "Malam Madori",
      "Miga",
      "Ringim",
      "Roni",
      "Sule Tankarkar",
      "Taura",
      "Yankwashi"
    ]
  },
  {
    "name": "Kaduna",
    "lgas": [
      "Birnin Gwari",
      "Chikun",
      "Giwa",
      "Igabi",
      "Ikara",
      "Jaba",
      "Jema'a",
      "Kachia",
      "Kaduna North",
      "Kaduna South",
      "Kagarko",
      "Kajuru",
      "Kaura",
      "Kauru",
      "Kubau",
      "Kudan",
      "Lere",
      "Makarfi",
      "Sabon Gari",
      "Sanga",
      "Soba",
      "Zangon Kataf",
      "Zaria"
    ]
  },
  {
    "name": "Kano",
    "lgas": [
      "Ajingi",
      "Albasu",
      "Bagwai",
      "Bebeji",
      "Bichi",
      "Bunkure",
      "Dala",
      "Dambatta",
      "Dawakin Kudu",
      "Dawakin Tofa",
      "Doguwa",
      "Fagge",
      "Gabasawa",
      "Garko",
      "Garun Mallam",
      "Gaya",
      "Gezawa",
      "Gwale",
      "Gwarzo",
      "Kabo",
      "Kano Municipal",
      "Karaye",
      "Kibiya",
      "Kiru",
      "Kumbotso",
      "Kunchi",
      "Kura",
      "Madobi",
      "Makoda",
      "Minjibir",
      "Nasarawa",
      "Rano",
      "Rimin Gado",
      "Rogo",
      "Shanono",
      "Sumaila",
      "Takai",
      "Tarauni",
      "Tofa",
      "Tsanyawa",
      "Tudun Wada",
      "Ungogo",
      "Warawa",
      "Wudil"
    ]
  },
  {
    "name": "Katsina",
    "lgas": [
      "Bakori",
      "Batagarawa",
      "Batsari",
      "Baure",
      "Bindawa",
      "Charanchi",
      "Dandume",
      "Danja",
      "Dan Musa",
      "Daura",
      "Dutsi",
      "Dutsin Ma",
      "Faskari",
      "Funtua",
      "Ingawa",
      "Jibia",
      "Kafur",
      "Kaita",
      "Kankara",
      "Kankia",
      "Katsina",
      "Kurfi",
      "Kusada",
      "Mai'Adua",
      "Malumfashi",
      "Mani",
      "Mashi",
      "Matazu",
      "Musawa",
      "Rimi",
      "Sabuwa",
      "Safana",
      "Sanda/Sandamu",
      "Zango"
    ]
  },
  {
    "name": "Kebbi",
    "lgas": [
      "Aleiro",
      "Arewa",
      "Argungu",
      "Augie",
      "Bagudo",
      "Birnin Kebbi",
      "Bunza",
      "Dandi",
      "Fakai",
      "Gwandu",
      "Jega",
      "Kalgo",
      "Koko/Besse",
      "Maiya/Maiyama",
      "Ngaski",
      "Sakaba",
      "Shanga",
      "Suru",
      "Danko-Wasagu",
      "Yauri",
      "Zuru"
    ]
  },
  {
    "name": "Kogi",
    "lgas": [
      "Adavi",
      "Ajaokuta",
      "Ankpa",
      "Bassa",
      "Dekina",
      "Ibaji",
      "Idah",
      "Igalamela Odolu",
      "Ijumu",
      "Kabba/Bunu",
      "Kogi",
      "Lokoja",
      "Mopa Muro",
      "Ofu",
      "Ogori/Magongo",
      "Okehi",
      "Okene",
      "Olamaboro",
      "Omala",
      "Yagba East",
      "Yagba West"
    ]
  },
  {
    "name": "Kwara",
    "lgas": [
      "Asa",
      "Baruten",
      "Edu",
      "Ekiti",
      "Ifelodun",
      "Ilorin East",
      "Ilorin South",
      "Ilorin West",
      "Irepodun",
      "Isin",
      "Kaiama",
      "Moro",
      "Offa",
      "Oke Ero",
      "Oyun",
      "Pategi"
    ]
  },
  {
    "name": "Lagos",
    "lgas": [
      "Agege",
      "Ajeromi-Ifelodun",
      "Alimosho",
      "Amuwo-Odofin",
      "Apapa",
      "Badagry",
      "Epe",
      "Eti Osa",
      "Ibeju-Lekki",
      "Ifako-Ijaiye",
      "Ikeja",
      "Ikorodu",
      "Kosofe",
      "Lagos Island",
      "Lagos Mainland",
      "Mushin",
      "Ojo",
      "Oshodi-Isolo",
      "Shomolu",
      "Surulere"
    ]
  },
  {
    "name": "Nasarawa",
    "lgas": [
      "Akwanga",
      "Awe",
      "Doma",
      "Karu",
      "Keana",
      "Keffi",
      "Kokona",
      "Lafia",
      "Nasarawa",
      "Nasarawa Egon",
      "Obi",
      "Toto",
      "Wamba"
    ]
  },
  {
    "name": "Niger",
    "lgas": [
      "Agaie",
      "Agwara",
      "Bida",
      "Borgu",
      "Bosso",
      "Chanchaga",
      "Edati",
      "Gbako",
      "Gurara",
      "Katcha",
      "Kontagora",
      "Lapai",
      "Lavun",
      "Magama",
      "Mariga",
      "Mashegu",
      "Mokwa",
      "Moya",
      "Paikoro",
      "Rafi",
      "Rijau",
      "Shiroro",
      "Suleja",
      "Tafa",
      "Wushishi"
    ]
  },
  {
    "name": "Ogun",
    "lgas": [
      "Abeokuta North",
      "Abeokuta South",
      "Ado-Odo/Ota",
      "Ewekoro",
      "Ifo",
      "Ijebu East",
      "Ijebu North",
      "Ijebu North East",
      "Ijebu Ode",
      "Ikenne",
      "Imeko Afon",
      "Ipokia",
      "Obafemi/Obafemi Owode",
      "Odeda",
      "Odogbolu",
      "Ogun Waterside",
      "Remo North",
      "Shaga/Shagamu",
      "Yewa North",
      "Yewa South"
    ]
  },
  {
    "name": "Ondo",
    "lgas": [
      "Akoko North-East",
      "Akoko North-West",
      "Akoko South-East",
      "Akoko South-West",
      "Akure North",
      "Akure South",
      "Ese Odo",
      "Idanre",
      "Ifedore",
      "Ilaje",
      "Ile Oluji/Okeigbo",
      "Irele",
      "Odigbo",
      "Okitipupa",
      "Ondo East",
      "Ondo West",
      "Ose",
      "Owo"
    ]
  },
  {
    "name": "Osun",
    "lgas": [
      "Aiyedaade",
      "Aiyedire",
      "Atakunmosa East",
      "Atakunmosa West",
      "Boluwaduro",
      "Boripe",
      "Ede North",
      "Ede South",
      "Egbedore",
      "Ejigbo",
      "Ife Central",
      "Ife East",
      "Ife North",
      "Ife South",
      "Ifedayo",
      "Ifelodun",
      "Ila",
      "Ilesa East",
      "Ilesa West",
      "Irepodun",
      "Irewole",
      "Isokan",
      "Iwo",
      "Obokun",
      "Odo Otin",
      "Ola Oluwa",
      "Olorunda",
      "Oriade",
      "Orolu",
      "Osogbo"
    ]
  },
  {
    "name": "Oyo",
    "lgas": [
      "Afijio",
      "Akinyele",
      "Atiba",
      "Atisbo",
      "Egbeda",
      "Ibadan North",
      "Ibadan North-East",
      "Ibadan North-West",
      "Ibadan South-East",
      "Ibadan South-West",
      "Ibarapa Central",
      "Ibarapa East",
      "Ibarapa North",
      "Ido",
      "Irepo",
      "Iseyin",
      "Itesiwaju",
      "Iwajowa",
      "Kajola",
      "Lagelu",
      "Ogbomosho North",
      "Ogbomosho South",
      "Ogo Oluwa",
      "Olorunsogo",
      "Oluyole",
      "Ona Ara",
      "Orelope",
      "Ori Ire",
      "Oyo East",
      "Oyo West",
      "Saki East",
      "Saki West",
      "Surulere"
    ]
  },
  {
    "name": "Plateau",
    "lgas": [
      "Bokkos",
      "Barkin Ladi",
      "Bassa",
      "Jos East",
      "Jos North",
      "Jos South",
      "Kanam",
      "Kanke",
      "Langtang North",
      "Langtang South",
      "Mangu",
      "Mikang",
      "Pankshin",
      "Qua'an Pan",
      "Riyom",
      "Shendam",
      "Wase"
    ]
  },
  {
    "name": "Rivers",
    "lgas": [
      "Abua/Odual",
      "Ahoada East",
      "Ahoada West",
      "Akuku-Toru",
      "Andoni",
      "Asari-Toru",
      "Bonny",
      "Degema",
      "Eleme",
      "Emuoha",
      "Etche",
      "Gokana",
      "Ikwerre",
      "Khana",
      "Obio/Akpor",
      "Ogba/Egbema/Ndoni",
      "Ogu/Bolo",
      "Okrika",
      "Omuma",
      "Opobo/Nkoro",
      "Oyigbo",
      "Port Harcourt",
      "Tai"
    ]
  },
  {
    "name": "Sokoto",
    "lgas": [
      "Binji",
      "Bodinga",
      "Dange Shuni",
      "Gada",
      "Goron/Goronyo",
      "Gudu",
      "Gwadabawa",
      "Illela",
      "Isa",
      "Kebbe",
      "Kware",
      "Rabah",
      "Sabon Birni",
      "Shagari",
      "Silame",
      "Sokoto North",
      "Sokoto South",
      "Tambuwal",
      "Tangaza",
      "Tureta",
      "Wamako",
      "Wurno",
      "Yabo"
    ]
  },
  {
    "name": "Taraba",
    "lgas": [
      "Ardo Kola",
      "Bali",
      "Donga",
      "Gashaka",
      "Gassol",
      "Ibi",
      "Jalingo",
      "Karim Lamido",
      "Kumi",
      "Lau",
      "Sardauna",
      "Takum",
      "Ussa",
      "Wukari",
      "Yorro",
      "Zing"
    ]
  },
  {
    "name": "Yobe",
    "lgas": [
      "Bade",
      "Bursari",
      "Damaturu",
      "Fika",
      "Fune",
      "Geidam",
      "Gujba",
      "Gulani",
      "Jakusko",
      "Karasuwa",
      "Machina",
      "Nangere",
      "Nguru",
      "Potiskum",
      "Tarmuwa",
      "Yunusari",
      "Yusufari"
    ]
  },
  {
    "name": "Zamfara",
    "lgas": [
      "Anka",
      "Bakura",
      "Birnin Magaji/Kiyaw",
      "Bukkuyum",
      "Bungudu",
      "Chafe",
      "Gummi",
      "Gusau",
      "Kaura Namoda",
      "Maradun",
      "Maru",
      "Shinkafi",
      "Talata Mafara",
      "Zurmi"
    ]
  },
  {
    "name": "Federal Capital Territory",
    "lgas": [
      "Abaji",
      "Abuja Municipal Area Council",
      "Bwari",
      "Gwagwalada",
      "Kuje",
      "Kwali"
    ]
  }
];

const CITY_DATA: Record<string, Pick<StateLocations, "popularAreas" | "suggestedZones">> = {
  Lagos: {
    popularAreas: [
      "Abule Egba", "Agege", "Ago", "Ajah", "Ajao Estate", "Akoka", "Alagbado", "Alagomeji", "Alakuko", "Amuwo Odofin",
      "Anthony", "Apapa", "Awoyaya", "Ayobo", "Badagry", "Balogun Market", "Bariga", "Costain", "Ebute Metta", "Egbeda",
      "Ejigbo", "Epe", "Fadeyi", "Festac", "Gbagada", "Iba", "Ibeju-Lekki", "Idimu", "Igando", "Ijora", "Ikeja", "Ikeja GRA",
      "Ikorodu", "Ikotun", "Ikoyi", "Ilupeju", "Ipaja", "Isolo", "Itire", "Iyana Ipaja", "Iju Ishaga", "Ketu", "Ladipo",
      "Lakowe", "Lasu", "Lawanson", "Lekki Phase 1", "Lekki", "Magodo", "Maryland", "Mazamaza", "Mile 2", "Mushin", "Obalende",
      "Ogba", "Ogudu", "Ojo", "Ojodu Berger", "Ojota", "Ojuelegba", "Okota", "Onipanu", "Opebi", "Orile", "Oshodi",
      "Oyingbo", "Palmgroove", "Sangotedo", "Satellite Town", "Shomolu", "Surulere", "Suru-Alaba", "Trade Fair", "Victoria Island",
      "Yaba",
    ],
    suggestedZones: [
      zone("Amuwo Odofin", "Festac", "Ago", "Okota", "Mile 2"),
      zone("Satellite Town", "Suru-Alaba", "Mazamaza"),
      zone("Ajao Estate", "Oshodi", "Surulere", "Lawanson", "Orile", "Itire", "Apapa", "Gbagada", "Trade Fair"),
      zone("Ikotun", "Ejigbo", "Egbeda", "Ipaja", "Lasu", "Iba", "Igando"),
      zone("Ojuelegba", "Ladipo", "Ebute Metta", "Mushin", "Shomolu", "Onipanu", "Oyingbo", "Maryland", "Costain"),
      zone("Yaba", "Bariga", "Alagomeji", "Fadeyi", "Palmgroove", "Ilupeju"),
      zone("Ketu", "Magodo", "Ojota", "Ogudu"),
      zone("Ogba", "Ikeja", "Agege"),
      zone("Abule Egba", "Iyana Ipaja", "Ayobo"),
      zone("Alagbado", "Alakuko", "Iju Ishaga"),
      zone("Balogun Market", "Ikoyi", "Lekki", "Victoria Island"),
      zone("Ojodu Berger"),
      zone("Ajah", "Sangotedo", "Awoyaya"),
      zone("Ibeju-Lekki", "Lakowe"),
      zone("Ikorodu"),
      zone("Ojo", "Badagry"),
      zone("Epe"),
    ],
  },
  "Federal Capital Territory": {
    popularAreas: [
      "Apo", "Asokoro", "Bwari", "Central Area", "Dutse", "Galadimawa", "Garki", "Gudu", "Gwagwalada", "Gwarinpa", "Jabi",
      "Jikwoyi", "Karu", "Kubwa", "Kuje", "Life Camp", "Lokogoma", "Lugbe", "Maitama", "Mararaba", "Nyanya", "Utako", "Wuse",
      "Wuye", "Zuba",
    ],
    suggestedZones: [
      zone("Wuse", "Maitama", "Garki", "Asokoro", "Central Area"),
      zone("Gwarinpa", "Jabi", "Utako", "Wuye", "Life Camp"),
      zone("Apo", "Lokogoma", "Galadimawa", "Gudu"),
      zone("Kubwa", "Dutse", "Bwari"),
      zone("Lugbe"),
      zone("Nyanya", "Karu", "Mararaba", "Jikwoyi"),
      zone("Gwagwalada", "Kuje", "Zuba"),
    ],
  },
  Rivers: {
    popularAreas: [
      "Ada George", "Aluu", "Choba", "D-Line", "Diobu", "Eleme", "Elelenwo", "GRA Port Harcourt", "Oyigbo", "Rumuibekwe",
      "Rumuigbo", "Rumuokoro", "Rumuola", "Trans-Amadi", "Woji",
    ],
    suggestedZones: [
      zone("GRA Port Harcourt", "D-Line", "Diobu"),
      zone("Rumuola", "Rumuokoro", "Ada George", "Rumuigbo"),
      zone("Trans-Amadi", "Woji", "Elelenwo", "Rumuibekwe"),
      zone("Choba", "Aluu"),
      zone("Eleme", "Oyigbo"),
    ],
  },
  Oyo: {
    popularAreas: [
      "Agbowo", "Agodi", "Akobo", "Apata", "Bodija", "Challenge", "Dugbe", "Eleyele", "Iwo Road", "Mokola", "Moniya",
      "Ojoo", "Oke-Ado", "Ring Road", "Sango", "UI",
    ],
    suggestedZones: [
      zone("Bodija", "UI", "Agbowo", "Sango", "Mokola"),
      zone("Dugbe", "Ring Road", "Challenge", "Oke-Ado"),
      zone("Iwo Road", "Agodi", "Akobo"),
      zone("Apata", "Eleyele"),
      zone("Moniya", "Ojoo"),
    ],
  },
  Ogun: {
    popularAreas: [
      "Abeokuta", "Agbara", "Akute", "Arepo", "Ibafo", "Ifo", "Ijebu-Ode", "Ijoko", "Magboro", "Mowe", "Sagamu", "Sango-Ota",
      "Warewa",
    ],
    suggestedZones: [
      zone("Sango-Ota", "Ijoko", "Akute", "Ifo"),
      zone("Mowe", "Ibafo", "Magboro", "Arepo", "Warewa"),
      zone("Agbara"),
      zone("Abeokuta"),
      zone("Ijebu-Ode", "Sagamu"),
    ],
  },
};

export interface City {
  name: string;
  // Other ways people write it ("PH", "Benin").
  aliases?: string[];
  // The LGAs / neighbourhoods (from the state's areas) that make up the city.
  areas: string[];
}

// Major cities and the areas they cover, so buyers can shop by city
// ("Port Harcourt", "Ibadan") as well as by area or state. Lagos and Abuja
// are left out: buyers there think in areas, and "Lagos" / "Abuja" already
// mean the whole state. Area names must match the state's LGAs or popular
// areas exactly (checked by scripts/check-nearby.ts).
export const CITIES: Record<string, City[]> = {
  Rivers: [
    {
      name: "Port Harcourt",
      aliases: ["PH", "Port-Harcourt"],
      areas: [
        "Port Harcourt", "Obio/Akpor", "GRA Port Harcourt", "D-Line", "Diobu", "Rumuola", "Rumuokoro", "Ada George",
        "Rumuigbo", "Trans-Amadi", "Woji", "Elelenwo", "Rumuibekwe", "Choba", "Aluu",
      ],
    },
  ],
  Oyo: [
    {
      name: "Ibadan",
      areas: [
        "Ibadan North", "Ibadan North-East", "Ibadan North-West", "Ibadan South-East", "Ibadan South-West", "Akinyele",
        "Egbeda", "Lagelu", "Oluyole", "Ido", "Ona Ara", "Agbowo", "Agodi", "Akobo", "Apata", "Bodija", "Challenge", "Dugbe",
        "Eleyele", "Iwo Road", "Mokola", "Moniya", "Ojoo", "Oke-Ado", "Ring Road", "Sango", "UI",
      ],
    },
    { name: "Ogbomosho", aliases: ["Ogbomoso"], areas: ["Ogbomosho North", "Ogbomosho South"] },
    { name: "Oyo", aliases: ["Oyo Town"], areas: ["Oyo East", "Oyo West", "Atiba"] },
  ],
  Ogun: [
    { name: "Abeokuta", areas: ["Abeokuta", "Abeokuta North", "Abeokuta South", "Odeda"] },
    { name: "Ota", aliases: ["Sango Ota"], areas: ["Ado-Odo/Ota", "Sango-Ota", "Ijoko", "Ifo", "Akute"] },
    { name: "Ijebu-Ode", areas: ["Ijebu-Ode", "Ijebu Ode"] },
    { name: "Sagamu", aliases: ["Shagamu"], areas: ["Sagamu", "Shaga/Shagamu"] },
    { name: "Mowe / Ibafo", aliases: ["Mowe", "Ibafo"], areas: ["Mowe", "Ibafo", "Magboro", "Arepo", "Warewa", "Obafemi/Obafemi Owode"] },
  ],
  Edo: [{ name: "Benin City", aliases: ["Benin"], areas: ["Oredo", "Egor", "Ikpoba Okha"] }],
  Enugu: [
    { name: "Enugu", areas: ["Enugu East", "Enugu North", "Enugu South"] },
    { name: "Nsukka", areas: ["Nsukka"] },
  ],
  Kano: [
    {
      name: "Kano",
      aliases: ["Kano City"],
      areas: ["Kano Municipal", "Fagge", "Dala", "Gwale", "Tarauni", "Nasarawa", "Kumbotso", "Ungogo"],
    },
  ],
  Kaduna: [
    { name: "Kaduna", aliases: ["Kaduna City"], areas: ["Kaduna North", "Kaduna South", "Chikun", "Igabi"] },
    { name: "Zaria", areas: ["Zaria", "Sabon Gari"] },
  ],
  Delta: [
    { name: "Warri", areas: ["Warri South", "Warri North", "Warri South West", "Uvwie", "Udu"] },
    { name: "Asaba", areas: ["Oshimili South", "Oshimili North"] },
    { name: "Sapele", areas: ["Sapele"] },
  ],
  Anambra: [
    { name: "Onitsha", areas: ["Onitsha North", "Onitsha South"] },
    { name: "Awka", areas: ["Awka North", "Awka South"] },
    { name: "Nnewi", areas: ["Nnewi North", "Nnewi South"] },
  ],
  "Akwa Ibom": [{ name: "Uyo", areas: ["Uyo"] }],
  "Cross River": [{ name: "Calabar", areas: ["Calabar Municipal", "Calabar South"] }],
  Kwara: [{ name: "Ilorin", areas: ["Ilorin East", "Ilorin South", "Ilorin West"] }],
  Osun: [
    { name: "Osogbo", aliases: ["Oshogbo"], areas: ["Osogbo", "Olorunda"] },
    { name: "Ile-Ife", aliases: ["Ife"], areas: ["Ife Central", "Ife East", "Ife North", "Ife South"] },
    { name: "Ilesa", aliases: ["Ilesha"], areas: ["Ilesa East", "Ilesa West"] },
  ],
  Ondo: [{ name: "Akure", areas: ["Akure North", "Akure South"] }],
  Ekiti: [{ name: "Ado-Ekiti", aliases: ["Ado Ekiti"], areas: ["Ado Ekiti"] }],
  Plateau: [{ name: "Jos", areas: ["Jos North", "Jos South", "Jos East"] }],
  Imo: [{ name: "Owerri", areas: ["Owerri Municipal", "Owerri North", "Owerri West"] }],
  Abia: [
    { name: "Aba", areas: ["Aba North", "Aba South", "Osisioma"] },
    { name: "Umuahia", areas: ["Umuahia North", "Umuahia South"] },
  ],
  Benue: [{ name: "Makurdi", areas: ["Makurdi"] }],
  Kogi: [{ name: "Lokoja", areas: ["Lokoja"] }],
  Borno: [{ name: "Maiduguri", areas: ["Maiduguri", "Jere"] }],
  Ebonyi: [{ name: "Abakaliki", areas: ["Abakaliki"] }],
  Bayelsa: [{ name: "Yenagoa", areas: ["Yenagoa"] }],
  Niger: [{ name: "Minna", areas: ["Chanchaga", "Bosso"] }],
  Bauchi: [{ name: "Bauchi", aliases: ["Bauchi City"], areas: ["Bauchi"] }],
  Sokoto: [{ name: "Sokoto", aliases: ["Sokoto City"], areas: ["Sokoto North", "Sokoto South"] }],
};

export const NIGERIA_LOCATIONS: StateLocations[] = STATES_AND_LGAS.map((state) => ({
  ...state,
  ...CITY_DATA[state.name],
}));

// Common ways people write a state name (in store addresses, from the
// browser's location) mapped to the names above.
const STATE_ALIASES: Record<string, string> = {
  abuja: "Federal Capital Territory",
  fct: "Federal Capital Territory",
  "fct abuja": "Federal Capital Territory",
  "federal capital territory": "Federal Capital Territory",
  nassarawa: "Nasarawa",
  "akwa-ibom": "Akwa Ibom",
  "cross-river": "Cross River",
};

// Spellings sellers may have typed for a state before names were
// normalised ("Lagos", "Lagos State", "Abuja", "FCT"...).
export const stateSpellings = (canonical: string) => [
  canonical,
  `${canonical} State`,
  ...Object.entries(STATE_ALIASES)
    .filter(([alias, name]) => name === canonical && alias !== canonical.toLowerCase())
    .map(([alias]) => alias),
];

// Matches "Lagos", "lagos state", "Lagos State, Nigeria", "Abuja"... to a
// state in NIGERIA_LOCATIONS, or null.
export const findState = (input: string | null | undefined): StateLocations | null => {
  if (!input) return null;
  const cleaned = input
    .toLowerCase()
    .replace(/,?\s*nigeria$/, "")
    .replace(/\s+state$/, "")
    .trim();
  const name = STATE_ALIASES[cleaned] ?? cleaned;
  return NIGERIA_LOCATIONS.find((state) => state.name.toLowerCase() === name.toLowerCase()) ?? null;
};
