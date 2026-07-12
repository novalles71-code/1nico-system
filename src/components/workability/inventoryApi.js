import {
  buildInventoryItems,
  getSitesForCustomer,
  normalizeKey,
  SITE_ALL,
} from "./workabilityHelpers";
import { buildMdlzInventorySearch } from "../mdlz/searchRules";

const INVENTORY_SERVER_URL = "http://10.1.1.156:3001";

const buildInventoryItemsWithCustomerRules = (bomComponents, customer) => {
  const customerCode = normalizeKey(customer);

  if (customerCode === "MDLZ") {
    return buildMdlzInventorySearch(bomComponents);
  }

  return {
    items: buildInventoryItems(bomComponents),
    aliases: {},
  };
};

export const fetchInventoryBatchMap = async ({
  bomComponents,
  siteToUse = SITE_ALL,
  selectedSites = [],
  customer = "",
}) => {
  const { items, aliases } = buildInventoryItemsWithCustomerRules(
    bomComponents,
    customer
  );

  if (!items.length) return {};

  const cleanSelectedSites = Array.from(
    new Set((Array.isArray(selectedSites) ? selectedSites : []).filter(Boolean))
  );

  const sitesToSend =
    cleanSelectedSites.length > 0
      ? cleanSelectedSites
      : siteToUse === SITE_ALL
        ? Array.from(new Set(getSitesForCustomer(customer).filter(Boolean)))
        : [siteToUse];

  const response = await fetch(`${INVENTORY_SERVER_URL}/inventory/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items,
      site: sitesToSend.length === 1 ? sitesToSend[0] : null,
      sites: sitesToSend,
    }),
  });

  if (!response.ok) {
    throw new Error(`Inventory Server error: ${response.status}`);
  }

  const data = await response.json();
  const map = {};

  (data.items || []).forEach((item) => {
    const keys = [
      item.itemNumber,
      item.item_number,
      item.sku,
      item.component_sku,
      item.requestedItem,
      item.requested,
      item.searchedAs,
    ]
      .map(normalizeKey)
      .filter(Boolean);

    keys.forEach((key) => {
      map[key] = item;
    });
  });

  Object.entries(aliases || {}).forEach(([originalItem, searchItem]) => {
    const originalKey = normalizeKey(originalItem);
    const searchKey = normalizeKey(searchItem);

    if (!originalKey || !searchKey) return;

    if (!map[originalKey] && map[searchKey]) {
      map[originalKey] = map[searchKey];
    }
  });

  return map;
};
