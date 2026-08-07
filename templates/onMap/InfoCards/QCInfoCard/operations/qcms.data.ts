import { ref } from "vue";
import { reactive } from "vue";

// 表单数据 和 key 一一对应
export const qcms_optionForm = reactive({
  cicle_direction: "",
  disc_platform_prefer_select: "",
  load_platform_prefer_select: "",
  late_ocr_enable: "",
  load_sequence_strategy: "",
  pt_wait_igv_befor_pickup_pf_enable: "",
  disch_to_apron_bypass_pf_strategy: "",
  igvType: "",
  qc_status: "",
});

export const qcms_optionList = ref([
  {
    title: "循环方向",
    key: "cicle_direction",
    options: [
      { value: "0", label: "ANTI_CLOCK_BOTH" },
      { value: "1", label: "ANTI_CLOCK_AND_CLOCK" },
      { value: "2", label: "CLOCK_BOTH" },
      { value: "3", label: "CLOCK_AND_ANTI_CLOCK" },
    ],
  },
  {
    title: "卸船优先分配平台",
    key: "disc_platform_prefer_select",
    options: [
      { value: "0", label: "海侧平台" },
      { value: "1", label: "陆侧平台" },
    ],
  },
  {
    title: "装船优先分配平台",
    key: "load_platform_prefer_select",
    options: [
      { value: "0", label: "海侧平台" },
      { value: "1", label: "陆侧平台" },
    ],
  },
  {
    title: "延时OCR",
    key: "late_ocr_enable",
    options: [
      { value: "0", label: "不启用" },
      { value: "1", label: "启用" },
    ],
  },
  {
    title: "装船策略",
    key: "load_sequence_strategy",
    options: [
      { value: "0", label: "strict_seq" },
      { value: "1", label: "swap_seq_not_swap_ctn" },
      { value: "2", label: "not_swap_seq_swap_ctn" },
      { value: "3", label: "swap_seq_swap_ctn" },
    ],
  },
  {
    title: "等待IGV信息",
    key: "pt_wait_igv_befor_pickup_pf_enable",
    options: [
      { value: "0", label: "不等待" },
      { value: "1", label: "等待" },
    ],
  },
  {
    title: "经过平台",
    key: "disch_to_apron_bypass_pf_strategy",
    options: [
      { value: "0", label: "all_pass_pf" },
      { value: "1", label: "only_hazard_not_pass_pf" },
      { value: "2", label: "all_not_pass_pf" },
    ],
  },
  {
    title: "车辆类型",
    key: "discharge_vehicle_type",
    options: [
      { value: "0", label: "truck" },
      { value: "1", label: "apron" },
      { value: "2", label: "igv" },
    ],
  },
  {
    title: "QC可用状态",
    key: "qc_status",
    options: [
      { value: "true", label: "是" },
      { value: "false", label: "否" },
    ],
  },
]);
