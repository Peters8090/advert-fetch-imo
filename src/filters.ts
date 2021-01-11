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
    search: (condition: (value: string) => boolean = () => true) => (
      value: string
    ) =>
      condition(sanitizeString(value))
        ? {
            $regex: convertToSearchRegex(sanitizeString(value)),
          }
        : undefined,
    normal: (
      convertToNumber: boolean = false,
      condition: (value: string) => boolean = () => true
    ) => (value: string) =>
      condition(sanitizeString(value))
        ? convertToNumber
          ? +sanitizeString(value)
          : sanitizeString(value)
        : undefined,
  };

  const filterList: {
    fieldName: string;
    aliasName?: string;
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
      aliasName: "area",
      isAllowed: isAllowedValidators.isRange(),
    },
    {
      fieldName: "liczbapokoi",
      aliasName: "rooms",
      isAllowed: isAllowedValidators.isRange(),
    },
    {
      fieldName: "location",
      isAllowed: isAllowedValidators.search(),
    },
    {
      fieldName: "advertisement_text",
      aliasName: "search",
      isAllowed: isAllowedValidators.search((value) => !+value),
    },
    {
      fieldName: "imoId",
      aliasName: "search",
      isAllowed: isAllowedValidators.normal(false, (value) => !!+value),
    },
    {
      fieldName: "page",
      isAllowed: isAllowedValidators.normal(true),
    },
    {
      fieldName: "limit",
      isAllowed: isAllowedValidators.normal(true),
    },
  ];

  const defaultFilters: Record<string, any> = {
    limit: 10,
  };
  let chosenFilters: Record<string, any> = {};

  for (const [name, value] of Object.entries(query)) {
    const foundFilters = filterList.filter(
      (f) => (f.aliasName ?? f.fieldName) === name
    );
    if (foundFilters.length) {
      for (const foundFilter of foundFilters) {
        const res = foundFilter.isAllowed(`${value}`);

        if (res) {
          chosenFilters[foundFilter.fieldName] = res;
          break;
        }
      }
    }
  }

  return { ...defaultFilters, ...chosenFilters };
};
