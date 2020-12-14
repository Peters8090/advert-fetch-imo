import { convertToSearchRegex, sanitizeString } from "./utility";

export const extractFilters = (query: object) => {
  const isAllowedValidators = {
    inList: (list: string[]) => (value: string) =>
      list.find((v) => v === value),
    isRange: () => (value: string) => {
      const res = /^\[([0-9.]+|null)-([0-9.]+|null)]$/.exec(value);
      if (!res) {
        return;
      }
      const [min, max] = [...res].slice(1);

      return {
        $gte: min === "null" ? -Infinity : +min,
        $lte: max === "null" ? Infinity : +max,
      };
    },
    search: () => (value: string) => ({
      $regex: convertToSearchRegex(sanitizeString(value)),
    }),
    normal: () => (value: string) => +sanitizeString(value),
  };

  const filterList: {
    fieldName: string;
    isAllowed: (value: string) => any;
  }[] = [
    {
      fieldName: "property_type",
      isAllowed: isAllowedValidators.inList([
        "mieszkania",
        "domy",
        "dzialki",
        "lokale",
      ]),
    },
    {
      fieldName: "transaction_type",
      isAllowed: isAllowedValidators.inList(["sprzedaz", "wynajem"]),
    },
    {
      fieldName: "price",
      isAllowed: isAllowedValidators.isRange(),
    },
    {
      fieldName: "powierzchnia",
      isAllowed: isAllowedValidators.isRange(),
    },
    {
      fieldName: "liczbapokoi",
      isAllowed: isAllowedValidators.isRange(),
    },
    {
      fieldName: "location",
      isAllowed: isAllowedValidators.search(),
    },
    {
      fieldName: "advertisement_text",
      isAllowed: isAllowedValidators.search(),
    },
    {
      fieldName: "page",
      isAllowed: isAllowedValidators.normal(),
    },
    {
      fieldName: "limit",
      isAllowed: isAllowedValidators.normal(),
    },
  ];

  const defaultFilters: Record<string, any> = {
    limit: 10,
  };
  let chosenFilters: Record<string, any> = {};

  for (const [name, value] of Object.entries(query)) {
    const foundFilter = filterList.find((f) => f.fieldName === name);
    if (foundFilter) {
      const res = foundFilter.isAllowed(`${value}`);

      if (res) {
        chosenFilters[name] = res;
      }
    }
  }
  return { ...defaultFilters, ...chosenFilters };
};
