export const pcslStageHackName = code =>
  ({
    "1.GOLDCOUNTRY": "Gold Country",
    "2.BELT": "BELT",
    "3.HARDBASS": "Hardbass",
    "4.CROSSROADS": "Crossroads",
    "5.TRAPHOUSE": "Trap House",
    "6.LEADPEDAL": "Lead Pedal",
    "7.BUYHIGHSELLLOW": "Buy High, Sell Low",
    "8.WEARESOBACK": "We Are So Back!",
    "9.ITSSOOVER": "It's So Over!",
    "10.AREYAWINNINSON": "Are Ya Winnin, Son?",
    "11.MOEZAMBIQUE": "MOE-Zambique",
    "12.WOLVERINES": "Wolverines!",
  })[code] || code;

export const pcslStageHackNumber = code => code?.split(".")[0];
export const pcslStageHackCode = code => `Stage ${pcslStageHackNumber(code)}`;
