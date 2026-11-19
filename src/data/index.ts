export const STSMap = new Map<
  string,
  {
    cheId: "QC071";
    MtHoistPos: 4000;
    MtTrolleyPos: 3140;
    PtHoistPos: 1610;
    PtTrolleyPos: 920;
    GantryPos: 25553;
  }
>();

export const AGVMap = new Map<
  string,
  {
    cheId: "V001";
    inventory: {
      cheId: "V001";
    };
    AGVX: 24805;
    AGVY: 23600;
    Heading: 9000;
    EnergyPercent: 44;
    Fault: 0;
    Charging: 2;
    "E-STOP": 0;
    AhtStatus: {
      cheId: "V001";
      heading: 90;
      location: "PB.PB009";
      locationX: 248050;
      locationY: 236000;
      orientation: "LANDSIDE";
      remainingFuel: 44;
      ahtFleet: "YES";
      controlMode: "Auto";
      technicalStatus: "GREEN";
      arrived: false;
    };
  }
>();

export const ASCMap = new Map<
  string,
  {
    cheId: "YC092";
    positions: Array2<number>;
  }
>();

import { BLOCK_DEFS } from "@source/data/handleYardData";
export const YardMap = new Map<
  string,
  {
    defs: RecordTypeV<typeof BLOCK_DEFS>;
  }
>();

export const BlockMap = new Map();

export const PreDefBlockMap = new Map<
  string,
  {
    areaName: "A.B07.018";
    x: 579500;
    y: 347750;
    hl: 2000;
    hw: 9690;
    type: 0;
    degree: 0;
  }
>();
