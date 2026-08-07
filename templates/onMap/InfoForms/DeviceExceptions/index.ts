import { Ref, ref } from "vue";

import { socketioSubModule_statustables as socketioHelper } from "@2dmapv2/data/initWebSocketData";
import { getTimeStampForSocketReq } from "@2dmapv2/classes/SocketioHelper";

export const total = ref(0);

export const DATALIST: Ref<
  {
    exceptionRecorderId: 303875;
    exceptionId: 841017;
    level: 3;
    system: "SCHEDULER";
    cheId: "V003";
    description: "橙色电量IGV无可用充电位";
    operator: "V003 ORANGE电量，无可用充电位";
    createTime: "2024-05-28 14:59:31";
    solution: { handleId: 40021; handleMessage: "充电机复位"; handleCode: "ResetICS" }[];
    type: "ECI";
  }[]
> = ref([]);

let subjected = false;
export const initialization = () => {
  const pk = "exceptionRecorderId";
  const socketIo = socketioHelper.socketioMainModule.socket;
  if (!subjected) {
    socketIo.on("dbMsgDataTable", (res) => {
      if (Array.isArray(res.data.dataTable.rows)) {
        // 添加
        if (res.data.operation == "upsert") {
          const needAdds = [];
          res.data.dataTable.rows.forEach((itemA) => {
            let hasUpsertItem = false;
            DATALIST.value.forEach((item, index) => {
              // 更新
              if (itemA[pk] === item[pk]) {
                DATALIST.value[index] = itemA;
                hasUpsertItem = true;
              }
            });
            if (!hasUpsertItem) needAdds.push(itemA);
          });
          DATALIST.value.unshift(...needAdds);
        }
        // 删除
        else if (res.data.operation === "delete") {
          DATALIST.value = DATALIST.value.filter((item) => {
            for (let i = 0; i < res.data.dataTable.rows.length; i++) {
              const itemD = res.data.dataTable.rows[i];
              if (item[pk] === itemD[pk]) return false;
            }
            return true;
          });
        }

        total.value = DATALIST.value.length;
      }
    });
    socketIo.emit("subDbLine", { id: getTimeStampForSocketReq(), event: "subDbLine", data: ["DF.Exception"] });
    subjected = true;
  }
};
