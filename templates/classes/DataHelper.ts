/**
 * 从数据源中找到数据例
 * @param findableList
 * @param information 数据例列
 * @returns
 */
export const findBaseXItem = <T extends Findable>(findableList: T[], ...findStrings: string[]): T => {
  let mostVote = 0;
  let mostVotedItem = undefined;
  for (let i = 0; i < findableList.length; i++) {
    const findableItem = findableList[i];

    // 根据 description, description_i18n, subject 等索引找到对应的配置对象
    let thisVote = 0;
    ["title", "subject", "description", "description_i18n"].forEach((dimension) => {
      if (!findableItem[dimension]) return; // 如果 BaseXItem 在此维度上没有信息 不进行遍历
      for (let j = 0; j < findStrings.length; j++) {
        const findString = findStrings[j];
        if (findableItem[dimension].includes(findString)) thisVote += 1;
      }
    });

    if (thisVote > mostVote) {
      mostVote = thisVote;
      mostVotedItem = findableItem;
      // 如果只搜索一维描述, 那么必定不会寻找模糊描述, 这样的操作没有意义
      if (findStrings.length === 1) return findableItem;
    }
  }

  return mostVotedItem;
};

/**
 * 初始化表格
 * @param tableList { BaseInfoTableItem[] } 表格数据数组
 */
export const resetBaseInfoTable = (tableList: BaseInfoTableItem[]) => {
  tableList.forEach((item) => {
    // 如果是个表头
    if (item.isTableTitle) return;

    // 如果 值 是个 多值
    if (Array.isArray(item.value)) {
      for (let i = 0; i < item.value.length; i++) {
        item.value[i] = "";
      }
    }
    // 如果 值 是个 单值
    else if (typeof item.value === "string" || typeof item.value === "number") {
      item.value = "";
    }
  });
};

/**
 * 初始化状态栏
 * @param statusLabels { BaseStatusLabelItem[] } 状态栏数据数组
 */
export const resetBaseStatusLabel = (baseStatusLabelItems: BaseStatusLabelItem[]) => {
  baseStatusLabelItems.forEach((baseStatusLabelItem) => {
    baseStatusLabelItem.src = baseStatusLabelItem.status.off; // 将图标换为灰色的
    baseStatusLabelItem.currentStatus = "off";
  });
};

/**
 * 设置状态栏状态
 * @param baseStatusLabelItem
 * @param currentStatusing
 */
export const setBaseStatusLabelStatus = (baseStatusLabelItem: BaseStatusLabelItem, currentStatus: string) => {
  baseStatusLabelItem.src = baseStatusLabelItem.status[currentStatus];
  baseStatusLabelItem.currentStatus = currentStatus;
};

/**
 * 获取某个对象的路径值
 * @param itemValue
 * @param paths
 * @returns
 */
export const getAccValue = (itemValue: any, ...paths: string[]) => {
  try {
    let pointer = itemValue;
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      // 如果没有数据或者没有找到路径对应的属性, 那么返回空字符串
      if (pointer === undefined) return "";
      pointer = pointer[path];
    }

    // 如果没有数据或者没有找到路径对应的属性, 那么返回空字符串
    if (pointer === undefined) return "";

    // 不需要特殊处理的, 直接返回指针值
    return pointer;
  } catch (err) {
    console.warn(`getAccValue[undefined] itemValue.${paths.join(".")}`);
  }
};
