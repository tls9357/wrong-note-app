// Parses a list of wrong problem numbers and aggregates them by 유형(type)
// using the workbook lookup data in data/mathTypes.js
const TypeAnalysis = (() => {
  function parseNumbers(raw) {
    return raw
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.replace(/[^0-9]/g, ""))
      .filter(Boolean)
      .map((s) => s.padStart(4, "0"));
  }

  function analyze(workbookId, rawInput) {
    const workbook = MATH_WORKBOOKS[workbookId];
    const numbers = parseNumbers(rawInput);

    const groups = new Map(); // key: chapter||section||type -> { chapter, section, type, count, numbers: [] }
    const notFound = [];
    const seen = new Set();
    const duplicates = [];

    numbers.forEach((num) => {
      if (seen.has(num)) {
        duplicates.push(num);
        return;
      }
      seen.add(num);

      const infos = workbook.numbers[num];
      if (!infos || !infos.length) {
        notFound.push(num);
        return;
      }
      infos.forEach((info) => {
        const key = `${info.chapter}||${info.section}||${info.type}`;
        if (!groups.has(key)) {
          groups.set(key, { chapter: info.chapter, section: info.section, type: info.type, numbers: [] });
        }
        groups.get(key).numbers.push(num);
      });
    });

    const groupList = Array.from(groups.values())
      .map((g) => ({ ...g, count: g.numbers.length }))
      .sort((a, b) => b.count - a.count);

    return {
      totalInput: numbers.length,
      matchedCount: numbers.length - notFound.length - duplicates.length,
      notFound,
      duplicates,
      groups: groupList,
    };
  }

  function findCrossRefNumbers(sourceWorkbookId, targetWorkbookId, section, type) {
    const crossMap = (typeof TYPE_CROSSREF !== "undefined" && TYPE_CROSSREF[`${sourceWorkbookId}->${targetWorkbookId}`]) || null;
    if (!crossMap) return null;
    const target = crossMap[`${section}::${type}`];
    if (!target) return null;

    const targetWorkbook = MATH_WORKBOOKS[targetWorkbookId];
    if (!targetWorkbook) return null;

    const numbers = Object.keys(targetWorkbook.numbers)
      .filter((num) =>
        targetWorkbook.numbers[num].some((info) => info.section === target.section && info.type === target.type)
      )
      .sort();

    return { workbookId: targetWorkbookId, workbookName: targetWorkbook.name, section: target.section, type: target.type, numbers };
  }

  return { analyze, parseNumbers, findCrossRefNumbers };
})();
