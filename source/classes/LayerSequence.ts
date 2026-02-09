enum LayerSequence {
  PLACEHOLDER0,

  BLOCK_NO,

  AGV_Base,
  AGV_Header,

  ASC_Gantry,
  ASC_Trolley,

  STS_Gantry,
  STS_Trolley,

  ASC_Label,
  STS_LABEL,
  AGV_LABEL,

  ACTIVE_LABEL, // 当前hover的Label
}

export default LayerSequence;
