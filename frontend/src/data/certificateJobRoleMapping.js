// Certificate to Job Role Mapping Data
// Updated with comprehensive job role certificate requirements

export const jobRoleCertifications = {
  "Spine Survey": {
    Mandatory: ["MT003",
    "SA002",
    "SA005",
    "K008",
    "SA051C or Equivalent",
    "S013",
    "S018",
    "NRSWA Certificate O1"],
    Alternative: [
    "SA006","SA001A","SA009"
    ]
},
  "Heavy Cabling UG": {
    Mandatory:["MT003",
    "SA002",
    "K009",
    "K008",
    "NRSWA Certificate O1",
    "SA003",
    "SA005",
    "K006"],
    Alternative:[
    "SA006"
    ]
},
  "Cable Blowing": {
    Mandatory: ["MT003",
    "SA002",
    "K009",
    "NRSWA Certificate O1"
  ],
  Alternative: ["SA006"]
},
  "Overblow": {
    Mandatory:[
    "MT003",
    "SA002",
    "N033",
    "NRSWA Certificate O1"],
    Alternative: [
      "SA006"
    ]
  },
  "Fibre Jointing (Ladder)": {
    Mandatory: ["MT003",
    "SA051C or Equivalent","SA051C",
    "SA001",
    "N020",
    "SA002",
    "K008","SA005",
    "N023",
    "NRSWA Certificate O1"],
    Alternative: [
    "SA009","SA006"
    ]
  },
  "Fibre Jointing (MEWP)": {
    Mandatory:[
    "MT003",
    "IPAF 1B or Equivalent",
    "SA001A",
    "SA002",
    "N020",
    "N023","K008","SA005",
    "NRSWA Certificate O1"],
    Alternative: [
      "SA001","SA009","SA006"
    ]
  },
  "Fibre Light Loss Testing (Ladder)": {
    Mandatory:[
    "MT003",
    "SA051C or Equivalent",
    "SA001",
    "SA002",
    "N039",
    "NRSWA Certificate O1"],
    Alternative:[
      "SA009","SA006"
    ]
    },
  "Fibre Light Loss Testing (MEWP)": {
    Mandatory:[
    "MT003",
    "IPAF 1B or Equivalent",
    "SA001A",
    "SA002",
    "N039",
    "NRSWA Certificate O1"
  ],
    Alternative: [
      "SA001","SA009","SA006"
    ]
},
  "Fibre Jointing - UG only": {
    Mandatory:[
    "MT003",
    "SA002",
    "N026","N020",
    "K008","SA005",
    "NRSWA Certificate O1"],
    Alternative:
    [
    "N023","SA006"
    ]
  },
  "Ribbon Fibre Jointing":{ 
    Mandatory: [
    "MT003",
    "SA002",
    "SA005",
    "N034",
    "NRSWA Certificate O1"],
    Alternative: ["SA006"]
  },
  "OFN Fibre Cabling - UG": {
    Mandatory:[
    "MT003",
    "SA002",
    "K008",
    "N028","SA003","SA005",
    "NRSWA Certificate O1"],
    Alternative:[
      "SA006"
    ]
    },
  "OFN Fibre Cabling - OH (Ladder)": {
    Mandatory:[
    "MT003",
    "SA051C or Equivalent",
    "SA001","SA008",
    "J005","SA005",
    "N027","SA024",
    "NRSWA Certificate O1"],
    Alternative:[
      "SA009"
    ]
  },
  "OFN Fibre Cabling - OH (MEWP)": {
    Mandatory: ["MT003",
    "IPAF 1B or Equivalent",
    "SA001A",
    "SA005",
    "SA008",
    "N027","J005","SA024",
    "NRSWA Certificate O1"],
    Alternative: [
    "SA009","SA001"
    ]
  },
  "Rod and Rope": {
    Mandatory: ["MT003",
    "SA002","SA003",
    "SA005",
    "K008",
    "NRSWA Certificate O1"],
    Alternative: [
      "SA006"
    ]
  },
  "FTTP Access Survey - 2": {
   Mandatory:[ "MT003",
    "SA002",
    "K008",
    "SA001","SA005",
    "SA051C or Equivalent",
     "S011 & S013","S017",
    "NRSWA Certificate O1"],
    Alternative: [
    "SA001A",
    "SA006",
    "SA009"
    ]
  },
  "FTTP Quality Checks - 2": {
    Mandatory: ["MT003",
    "SA002",
    "M006",
    "SA001",
    "M022",
    "SA005",
    "M023","SA051C or Equivalent",
    "NRSWA Certificate O1"],
    Alternative: [
    "SA001A","SA009",
    "SA006"
    ]
  },
  "MDU Survey": {
   Mandatory: [ "MT003",
    "SA002",
    "K008","S012 & S013",
    "SA020","SA005",
    "NRSWA Certificate O1",
    
    "SA007 & Equivalent"], Alternative: [
    "SA020A","A16","SA006"
    ]
  },
  "MDU Quality Checks": {
    Mandatory: [
    "MT003",
    "SA002",
    "SA007 & Equivalent",
    "M029",
    "NRSWA Certificate O1",
    "SA005"],
    Alternative: [
      "SA006"
    ]
  },
  "MDU L2C": {
    Mandatory: [
    "MT003",
    "SA020",
    "SA007 & Equivalent",
    "N030",
    "SA051C or Equivalent"],
    Alternative: ["A16"]
  },
  "Internal MDU Build": {
    Mandatory: [
    "MT003",
    "SA020",
    "SA007 Or Equivalent",
    "N029",
    "SA005"], Alternative: [
      "A16"
    ]
  },
  "FTTP L2C Home Install": {
    Mandatory: [
    "MT003",
    "SA020",
    "N038",
    "SA051C or Equivalent"],
    Alternative: [
      "A16"
    ]
  },
  "FTTP L2C step 1 (Ladder)": {
    Mandatory: ["MT003",  
    "SA002",
    "SA051C or Equivalent",
    "SA001",
    "N022",
    "NRSWA Certificate O1",
    "K008",
    "N10",
    "SA005"],
    Alternative: ["SA006","SA009"]
  },
  "FTTP L2C step 1 (MEWP)": {
    Mandatory: [
    "MT003",
    "SA002",
    "IPAF 1B or Equivalent",
    "SA001A",
    "N022",
    "NRSWA Certificate O1",
    "K008",
    "N10",
    "SA005"],
    Alternative: ["SA001","SA009","SA006"
    ]},
  "FTTP L2C step 1 - OH only (Ladder)": {
    Mandatory: [
    "MT003",
    "SA051C or Equivalent",
    "N043",
    "NRSWA Certificate O1"],
    Alternative: [ "SA001",
    "SA009"]
  },
  "FTTP L2C step 1 - OH only (MEWP)": {
    Mandatory: [
    "MT003",
    "IPAF 1B or Equivalent",
    "SA001A",
    "N043",
    "NRSWA Certificate O1"],
    Alternative: [
    "SA001",
    "SA009"
    ]
  },
  "FTTP L2C repair (Ladder)": {
    Mandatory : [
    "MT003",
    "SA002",
    "SA051C or Equivalent",
    "SA001",
    "N011",
    "NRSWA Certificate O1"],
    Alternative: ["SA006","SA009"]
  },
  "FTTP L2C repair (MEWP)": {
    Mandatory: [
    "MT003",
    "SA002",
    "IPAF 1B or Equivalent",
    "SA001A",
    "N011",
    "NRSWA Certificate O1"],
    Alternative: [
    "SA001",
    "SA009",
    "SA006"
    ]
  },
  "FTTP L2C Step 2": {
    Mandatory: [
    "MT003",
    "SA020",
    "N037",
    "SA051C or Equivalent"],
    Alternative: ["A16"]
  },
  "Optical Test Head Installation - Viavi": {
    Mandatory: [
    "MT003",
    "SA020",
    "N036"],
    Alternative: ["A16"]
  },
  "Optical Test Head Installation - Exfo": {
    Mandatory: [
    "MT003",
    "SA020",
    "N041"],
    Alternative: ["A16"]
  },
  "PTO": {
    Mandatory: [
    "MT003",
    "SA002 Or SA006",
    "N011",
    "N035",
    "NRSWA Certificate O1",
    "N039"],
    Alternative: []
  },
  "Supervisor - 2": {
    Mandatory: [
    "MT003",
    "NRSWA Card Certificate S1"]
    , Alternative: []
  },
  "Poling - PEU Operative": {
    Mandatory: [
    "MT003",
    "SA001A",
    "SA002",
    "SA021",
    "O002",
    "O003",
    "O004",
    "O005",
    "NRSWA Certificate LA",
    "NRSWA Certificate 01",
    "NRSWA Certificate 02",
    "NRSWA Certificate 03",
    "SA023 or Equivalent",
    "SA051C or Equivalent",
    "O008",
    "SA005"],
    Alternative: [
      "SA009","SA006","A14 or Equivalent"
    ]
  },
  "Poling - Overhead Copper dropwiring (Ladder)": {
    Mandatory:[
    "MT003",
    "SA051C or Equivalent",
    "SA001A",
    "E001",
    "NRSWA Certificate O1",
    "SA023 or Equivalent",
    "K003 + K004",
    "O008",
    "SDA008",
    "SA005",
    "SA024"
  ],
Alternative: [
  "SA009"
]},
  "Poling - Overhead Copper dropwiring (MEWP)": {
    Mandatory:[
    "MT003",
    "IPAF 1B or Equivalent",
    "SA001A",
    "E001",
    "NRSWA Certificate O1",
    "SA023 or Equivalent",
    "K003 + K004",
    "0008",
    "SDA008",
    "SA005",
    "SA024"
  ],
  Alternative:[
    "SA009",
    "SA001"
  ]},
  "Poling - Overhead Copper Jointing (Ladder)": {
    Mandatory:[
    "MT003",
    "SA051C or Equivalent",
    "SA001",
    "F020",
    "NRSWA Certificate O1",
    "SA023 or Equivalent",
    "K003 + K004",
    "0008",
    "SDA008",
    "SA005",
    "SA024"
  ],
  Alternative:[
    "SA009"
  ]},
  "Poling - Overhead Copper Jointing (MEWP)": {
  Mandatory:[
    "MT003",
    "IPAF 1B or Equivalent",
    "SA001A",
    "F020",
    "NRSWA Certificate O1",
    "SA023 or Equivalent",
    "K003 + K004",
    "0008",
    "SDA008",
    "SA005",
    "SA024"
  ],
  Alternative:[
    "SA009",
    "SA001"
  ]},
  "MEWP Operator": {
    Mandatory:[
    "MT003",
    "SA001A",
    "0",
    "IPAF 1B or Equivalent",
    "NRSWA Certificate O1",
    "SA051c or Equivalent",
    "1a or Equivalent",
    "3a & 3b or Equivalent",
    "SA008",
    "SA005",
    "SA023"
  ],
  Alternative:[
    "SA009",
    "SA001"
  ]},
  "Manual poling (provision and recovery)": {
    Mandatory:[
    "MT003",
    "SA001A",
    "SA005",
    "SA002",
    "O009",
    "NRSWA Certificate LA",
    "NRSWA Certificate 01",
    "NRSWA Certificate 02",
    "NRSWA Certificate 03",
    "SA023 or Equivalent",
    "SA051C or Equivalent",
    "O008",
    "SA005"
  ],
  Alternative:[
    "SA009",
    "SA001",
    "SA006"
  ]},
  "Pole recovery": {
    Mandatory:[
    "MT003",
    "SA001A",
    "SA002",
    "SA021",
    "O005",
    "NRSWA Certificate LA",
    "NRSWA Certificate 01",
    "NRSWA Certificate 02",
    "NRSWA Certificate 03",
    "SA023 or Equivalent",
    "SA051C or Equivalent",
    "SA005"
  ],
  Alternative:[
    "SA009",
    "SA006",
    "A14 or Equivalent"
  ]},
  "Pole Survey (AAP)": {
    Mandatory:[
    "MT003",
    "SA002",
    "S013",
    "NRSWA Certificate O1",
    "SA015c Or Equivalent" ,
    "SA001",
    "S017",
    "SA005"
  ],
  Alternative:[
    "SA009",
    "SA006",
    "SA001A"
  ]},

  "Aerial cabling (Ladder)": {
    Mandatory:[
    "MT003",
    "SA051C or Equivalent",
    "K003",
    "NRSWA Certificate O1",
    "SA008",
    "K004",
    "SA005",
    "SA024"
  ],
  Alternative:[
    "SA009",
    "SA001"
  ]},
  "Aerial cabling (MEWP)": {
    Mandatory:[
    "MT003",
    "IPAF 1B or Equivalent",
    "K003",
    "NRSWA Certificate O1",
    "SA008",
    "SA001A",
    "K004",
    "SA005",
    "SA024",
  ],
  Alternative:[
    "SA009",
    "SA001"
  ]},
  "Poling Labourer": {
    Mandatory:[
    "MT003",
    "SA001A",
    "0003",
    "NRSWA Certificate O1",
    "SA002",],
    Alternative:[
    "SA001",
    "SA009",
    "SA006"
  ]},
  "Blockages": {
    Mandatory:[
    "MT003",
    "SA006",
    "Q020(DB1)",
    "Q020(DB1)",
    "NRSWA Certificate LA",
    "K003",
    "NRSWA Certificate 01",
    "NRSWA Certificate O2",
    "NRSWA Certificate O3"
    ],
    Alternative:[
    "G01"
  ]},
  "Chambers Modular": {
    Mandatory:[
    "MT003",
    "SA006",
    "Q013(BB1M)",
    "NRSWA Certificate LA",
    "NRSWA Certificate O1",
    "NRSWA Certificate O2",
    "NRSWA Certificate O3",
    "Q035(SEC1)"
  ],
  Alternative:[
    "G01",
  ]},
  "Chambers Concrete": {
    Mandatory:[
    "MT003",
    "SA006",
    "Q012(BB1C)",
    "NRSWA Certificate LA",
    "NRSWA Certificate O1",
    "NRSWA Certificate O2",
    "NRSWA Certificate O3"
  ],
  Alternative:[
    "GO1"
  ]},
  "Chambers Concrete advanced": {
    Mandatory:[
    "MT003",
    "SA006",
    "Q014(BB2C)",
    "NRSWA Certificate LA",
    "NRSWA Certificate O1",
    "NRSWA Certificate O2",
    "NRSWA Certificate O3"
  ],
  Alternative:[
    "GO1"
  ]},
  "Carriageway Chambers": {
    Mandatory:[
    "MT003",
    "SA006",
    "Q015(BB3C)",
    "NRSWA Certificate LA",
    "NRSWA Certificate O1",
    "NRSWA Certificate O2",
    "NRSWA Certificate O3"
  ],
  Alternative:[
    "GO1"
  ]},
  "Chambers Brick": {
    Mandatory:[
    "MT003",
    "SA006",
    "Q011(BB1B)",
    "NRSWA Certificate LA",
    "NRSWA Certificate O1",
    "NRSWA Certificate O2",
    "NRSWA Certificate O3",
    "Q035(SEC1)"
  ],
  Alternative:[
    "GO1"
  ]},
  "Manhole build":{
  Mandatory:[
    "MT003",
    "SA006",
    "EUSR Category 3",
    "EUSR Category 4",
    "EUSR Category 5",
    "Q029(MH1)",
    "NRSWA Certificate LA",
    "NRSWA Certificate O1",
    "NRSWA Certificate O2",
    "NRSWA Certificate O3"
  ],
  Alternative:[
    "Level 2 Award Excavation support systems"
  ]},
  "Manhole Reroof": {
    Mandatory:[
    "MT003",
    "SA006",
    "EUSR Category 3",
    "EUSR Category 4",
    "EUSR Category 5",
    "Q031",
    "NRSWA Certificate LA",
    "NRSWA Certificate O1",
    "NRSWA Certificate O2",
    "NRSWA Certificate O3"
  ],
  Alternative:[
    "Level 2 Award Excavation support systems"
  ]},
  "Duct Laying Basic": {
    Mandatory:[
    "MT003",
    "SA006",
    "Q021(DL1)",
    "Q019(CD1)",
    "NRSWA Certificate LA",
    "NRSWA Certificate O1",
    "NRSWA Certificate O2",
    "NRSWA Certificate O3",
    "Q036(SLEW1)"
  ],
  Alternative:[
    "GO1"
  ]},
  "Duct Laying Intermediate": {
    Mandatory:[
    "MT003",
    "SA006",
    "Q021(DL1)",
    "Q022(DL2)",
    "Q019(CD1)",
    "NRSWA Certificate LA",
    "NRSWA Certificate O1",
    "NRSWA Certificate O2",
    "NRSWA Certificate O3",
    "Q037(SLEW2)"
  ],
  Alternative:[
    "GO1"
  ]},
  "Duct Laying Advanced": {
    Mandatory:[
    "MT003",
    "SA006",
    "Q021(DL1)",
    "Q022(DL2)",
    "Q023 (DL3)",
    "Q019(CD1)",
    "NRSWA Certificate LA",
    "NRSWA Certificate O1",
    "NRSWA Certificate O2",
    "NRSWA Certificate O3",
    "Q038(SLEW3)"
  ],
  Alternative:[
    "GO1"
  ]},
  "Duct Slew Basic": {
    Mandatory:[
    "MT003",
    "SA006",
    "Q036(SLEW1)",
    "K008",
    "NRSWA Certificate LA",
    "NRSWA Certificate O1",
    "NRSWA Certificate O2",
    "NRSWA Certificate O3"
  ],
  Alternative:[
    "GO1"
  ]},
  "Duct Slew Intermediate": {
    Mandatory:[
    "MT003",
    "SA006",
    "Q036(SLEW1)",
    "Q037(SLEW2)",
    "K008",
    "NRSWA Certificate LA",
    "NRSWA Certificate O1",
    "NRSWA Certificate O2",
    "NRSWA Certificate O3"
  ],
  Alternative:[
    "GO1"
  ]},
  "Duct Slew Advanced": {
    Mandatory:[
    "MT003",
    "SA006",
    "Q036(SLEW1)",
    "Q037(SLEW2)",
    "Q038(SLEW3)",
    "K008",
    "NRSWA Certificate LA",
    "NRSWA Certificate O1",
    "NRSWA Certificate O2",
    "NRSWA Certificate O3"
  ],
  Alternative:[
    "GO1"
  ]},
  "Mole ploughing": {
    Mandatory:[
    "MT003",
    "SA006",
    "Q030(MP1)",
    "NRSWA Certificate LA",
    "NRSWA Certificate O1",
    "NRSWA Certificate O2",
    "NRSWA Certificate O3"
  ],
  Alternative:[
    "GO1"
  ]},
  "Maintenance Excavation": {
    Mandatory:[
    "MT003",
    "SA006",
    "Q028(ME1)",
    "K008",
    "NRSWA Certificate LA",
    "NRSWA Certificate O1",
    "NRSWA Certificate O2",
    "NRSWA Certificate O3"
  ],
  Alternative:[
    "GO1"
  ]},
  "Reinstatement Operative - Footway": {
    Mandatory:[
    "MT003",
    "SA006",
    "NRSWA Certificate LA",
    "NRSWA Certificate O1",
    "NRSWA Certificate O2",
    "NRSWA Certificate O3",
    "NRSWA Certificate O4",
    "NRSWA Certificate O5",
    "NRSWA Certificate O8",
    "Certificate O6",
    "Certificate O7"
  ],
  Alternative:[
    "GO1"
  ]},
  "Reinstatement Operative - Carriageway": {
    Mandatory:[
    "MT003",
    "SA006",
    "NRSWA Certificate LA",
    "NRSWA Certificate O1",
    "NRSWA Certificate O2",
    "NRSWA Certificate O3",
    "NRSWA Certificate O4",
    "NRSWA Certificate O6",
    "NRSWA Certificate O7",
    "NRSWA Certificate O8",
    "Certificate O5"
  ],
  Alternative:[
    "GO1"
  ]},
  "Frame and Cover footway": {
    Mandatory:[
    "MT003",
    "SA006",
    "Q025(FCFW1)",
    "NRSWA Certificate LA",
    "NRSWA Certificate O1",
    "NRSWA Certificate O2",
    "NRSWA Certificate O3",
    "Q035(SEC1)"
  ],
  Alternative:[
    "GO1",
  ]},
  "Frame and Cover Carriageway": {
    Mandatory:[
    "MT003",
    "SA006",
    "Q024 (FCCW1)",
    "NRSWA Certificate LA",
    "NRSWA Certificate 01",
    "NRSWA Certificate 02",
    "NRSWA Certificate 03",
    "Q035(SEC1)"
  ],
  Alternative:[
    "GO1"
  ]},
  "DSLAM Construction":{
    Mandatory:[
    "MT003",
    "SA006",
    "SA018",
    "Q016(CB2) & Q017(CB3)",
    "Q017(CB3)",
    "NRSWA Certificate LA",
    "NRSWA Certificate O1",
    "NRSWA Certificate O2",
    "NRSWA Certificate O3",
    "N025"
  ],
  Alternative:[
    "GO1"
  ]},
  "PCP Construction": {
    Mandatory:[
    "MT003",
    "SA006",
    "SA018",
    "Q018 (CCC1)",
    "NRSWA Certificate LA",
    "NRSWA Certificate O1",
    "NRSWA Certificate O2",
    "NRSWA Certificate O3",
    "F016",
    "F022",
    "SA004",
    "SA005"
  ],
  Alternative:[
    "GO1"
  ]},
  "Desilting, Gully sucking or Manhole survey": {
    Mandatory:[
    "MT003",
    "SA002",
    "NRSWA Certificate O1"
  ],
  Alternative:[
    "SA006",
  ]},
  "Narrow Trenching": {
    Mandatory:[
    "MT003",
    "SA006",
    "Q039",
    "NRSWA Certificate LA",
    "NRSWA Certificate O1",
    "NRSWA Certificate O2",
    "NRSWA Certificate O3"
  ],
  Alternative:[
    "G01",
  ]},
  "Labourer": {
  Mandatory:[
    "MT003",
    "SA006",
    "NRSWA Certificate O1"
  ],
  Alternative:[
    "GO1"
  ]},
  "Trial Hole Excavation": {
    Mandatory:[
    "MT003",
    "SA006",
    "NRSWA Certificate LA",
    "NRSWA Certificate O1",
    "NRSWA Certificate O2",
    "NRSWA Certificate O3"
  ],
  Alternative:[
    "GO1",
  ]},
  "FTTC Commissioning": {
    Mandatory:[
    "MT003",
    "SA002",
    "N005",
    "NRSWA Certificate O1",
    "N024",
    "SA005"
  ],
  Alternative:[
    "SA006"
  ]},
  "Copper Frames": {
    Mandatory:[
    "MT003",
    "SA020",
    "H001",
    "H004",
    "SA005"
  ],
  Alternative:[
    "A16"
  ]},
  "Fibre Frames - Accredited for correct frame type": {
    Mandatory:[
    "MT003",
    "SA020",
    "N031 (ODF)",
    "N004 (OCR)",
    "J010 (OFF OR OFR)",
    "J008",
    "SA005"
  ],
  Alternative:[
    "A16"
  ]},
  "CAL/OMI (Ladder)": {
    Mandatory:[
    "MT003",
    "SA051C or Equivalent",
    "SA001",
    "SA020",
    "C004",
    "E001",
    "F005",
    "NRSWA Certificate O1",
    "F017",
    "G005",
    "N030",
    "SA008",
    "SA005",
    "SA024"
  ],
  Alternative:[
    "SA009",
    "A16"
  ]},
  "CAL/OMI (MEWP)": {
    Mandatory:[
    "MT003",
    "IPAF 1B or Equivalent",
    "SA001A",
    "SA020",
    "C004",
    "E001",
    "F005",
    "NRSWA Certificate O1",
    "F017",
    "G005",
    "N030",
    "SA008",
    "SA005",
    "SA024"
  ],
  Alternative:[
    "SA001",
    "SA009",
    "A16"
  ]},
  "Copper Jointing UG": {
    Mandatory:[
    "MT003",
    "SA002",
    "F020",
    "NRSWA Certificate O1"
  ],
  Alternative:[
    "SA006"
  ]},
  "Copper First Look UG": {
    Mandatory:[
    "MT003",
    "SA002",
    "F023",
    "F020",
    "NRSWA Certificate O1"
  ],
  Alternative:[
    "SA006"
  ]},
  "FTTC MI (LADDER)": {
    Mandatory:[
    "MT003",
    "SA051C or Equivalent",
    "F005",
    "NRSWA Certificate 01",
    "N006",
    "SA001",
    "F017",
    "SA005",
    "SA020"
  ],
  Alternative:[
    "SA009",
    "A16"
  ]},
  "FTTC MI (MEWP)": {
    Mandatory:[
    "MT003",
    "IPAF 1B or Equivalent",
    "F005",
    "NRSWA Certificate O1",
    "N006",
    "SA001A",
    "SA020",
    "F017",
    "SA005"
  ],
  Alternative:[
    "SA001",
    "SA009",
    "A16"
  ]},
  "FTTC SI": {
    Mandatory:[
    "MT003",
    "F005",
    "F017",
    "NRSWA Certificate O1"
  ], Alternative: []},
  "PCP Maintenance": {
    Mandatory:[
    "MT003",
    "NRSWA Certificate O1",
    "G39"
  ], Alternative: []},
  "Heavy cable recovery": {
    Mandatory:[
    "MT003",
    "SA002",
    "K010",
    "NRSWA Certificate O1"
  ],
  Alternative:[
    "SA006"
  ]},
  "Supply and Install Engineer": {
    Mandatory:[
    "MT003",
    "SA020",
    "SA005",
    "SA007",
    "UKATA"
  ],
  Alternative:[
    "A16"
  ]},
  "Supply and Install - Fibre Cable installation": {
    Mandatory:[
    "MT003",
    "SA020",
    "J008",
    "SA005",
    "SA007",
    "UKATA"
  ],
  Alternative:[
    "A16"
  ]},
  "Supply and Install - Mobile installation": {
    Mandatory:[
    "MT003",
    "SA020",
    "NRSWA Certificate O1",
    "SA005",
    "SA007 or Equivalent",
    "SA026 or Equivalent"
  ],
  Alternative:[
    "A16"
  ]},
  "Supply and Install - Civils": {
    Mandatory:[
    "MT003",
    "SA006"
  ], Alternative: []},
  "Ancillary Wiring or LLU Cabling": {
    Mandatory:[
    "MT003",
    "SA020",
    "SA007 or Equivalent",
    "SA051C or Equivalent",
    "SA026"
  ], Alternative: []},
  "Auxillary Overhead": {
    Mandatory:[
    "MT003",
    "SA006",
    "NRSWA Certificate O1"
  ],
  Alternative:[
    "G01"
  ]},
  "DSLAM Power Meter": {
    Mandatory:[
    "MT003",
    "SA006",
    "NRSWA Certificate O1"
  ],
  Alternative:[
    "G01"
  ]},
  "DSLAM - Power (RCD)": {
    Mandatory:[
    "MT003",
    "SA006",
    "C & G Part 1,2 & 3 or Equivalent",
    "18TH EDITION",
    "C & G 2391 - 51 OR EQUIVALENT",
    "NRSWA Certificate O1"
  ],
  Alternative:[
    "G01"
  ]},
  "DSLAM Battery Replacement or Rotation": {
    Mandatory:[
    "MT003",
    "SA006",
    "Ace Telecoms Battery installation course, A350",
    "NRSWA Certificate O1",
    "SA005"
  ],
  Alternative:[
    "G01"
  ]},
  "Conductive Concrete": {
    Mandatory:[
    "MT003",
    "SA006",
    "NRSWA Certificate LA",
    "NRSWA Certificate O1",
    "NRSWA Certificate O2",
    "NRSWA Certificate O3"
  ],
  Alternative:[
    "G01"
  ]},
  "Equipotential Bonding": {
    Mandatory:[
    "MT003",
    "SA006",
    "K008",
    "NRSWA Certificate O1"
  ],
  Alternative:[
    "G01"
  ]},
};

// Keep the old export for backward compatibility
export const jobRoleCertificateMapping = {};

// All available certificates with descriptions
export const allCertificates = {
  // Safety Accreditations
  "SA001": "MEWP (Mobile Elevated Work Platform) Safety Certification",
  "SA002": "Basic Safety Training and Awareness",
  "SA006": "Advanced Safety Protocol and Risk Assessment",
  "SA005": "General Safety Awareness and Site Induction",
  "SA018": "Specialized Safety Protocol for High-Risk Operations",
  "SA020": "Environmental Safety and Sustainability Practices",

  // Craft Accreditations
  "K008": "Underground Cabling Specialist Certification",
  "N023": "Fibre Optic Technician Level 1",
  "N027": "Advanced Fibre Optic Installation and Maintenance",
  "N038": "Telecommunications Equipment Installation",
  "N039": "Network Infrastructure Design and Implementation",

  // NRSWA Streetworks
  "NRSWA Certificate O1": "NRSWA Operative Unit 1 - Basic Streetworks",
  "NRSWA Certificate LA & O1 & O2 & O3": "NRSWA Location & Assessment + All Operative Units (Supervisor Level)",

  // Security and Regulatory
  "MT003": "Mandatory Security & Regulatory Compliance Training",

  // Optional certifications
  "Emergency First Aid": "Basic Emergency Response and First Aid",
  "Advanced First Aid": "Advanced Emergency Medical Response",
  "Fire Safety": "Fire Prevention and Emergency Response"
};

// Helper function to get all certificates for a job role
export const getCertificatesForJobRole = (jobRole) => {
  const mapping = jobRoleCertifications[jobRole];
  if (!mapping) return { mandatory: [], alternative: [] };

  const mandatoryCerts = (mapping.Mandatory || []).map(cert => ({
    code: cert,
    description: allCertificates[cert] || cert,
    category: 'Mandatory'
  }));

  const alternativeCerts = (mapping.Alternative || []).map(cert => ({
    code: cert,
    description: allCertificates[cert] || cert,
    category: 'Alternative'
  }));

  return {
    mandatory: mandatoryCerts,
    alternative: alternativeCerts
  };
};

// Helper function to get certificates for multiple job roles
export const getCertificatesForMultipleJobRoles = (jobRoles) => {
  if (!Array.isArray(jobRoles) || jobRoles.length === 0) {
    return { mandatory: [], alternative: [] };
  }

  const allMandatory = new Map();
  const allAlternative = new Map();

  jobRoles.forEach(jobRole => {
    const certs = getCertificatesForJobRole(jobRole);
    
    certs.mandatory.forEach(cert => {
      if (!allMandatory.has(cert.code)) {
        allMandatory.set(cert.code, cert);
      }
    });

    certs.alternative.forEach(cert => {
      if (!allAlternative.has(cert.code)) {
        allAlternative.set(cert.code, cert);
      }
    });
  });

  return {
    mandatory: Array.from(allMandatory.values()),
    alternative: Array.from(allAlternative.values())
  };
};

// Get all unique job roles (returns exactly 93 hardcoded roles)
export const getAllJobRoles = () => {
  return Object.keys(jobRoleCertifications);
};
