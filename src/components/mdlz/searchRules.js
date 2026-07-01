import { normalizeKey } from "../workability/workabilityHelpers";

export const isMdlzCadComponent = (component) => {
  const type = normalizeKey(component.type);
  const sku = normalizeKey(component.component_sku);
  const description = normalizeKey(component.component_description);

  return (
    type.includes("CAD") ||
    sku.startsWith("CAD") ||
    description.includes("CAD#") ||
    description.includes("CAD #")
  );
};

export const getMdlzCadSearchCode = (value) => {
  return String(value || "").replace(/\D/g, "");
};

export const isMdlzFilmComponent = (component) => {
  const type = normalizeKey(component.type);
  const sku = normalizeKey(component.component_sku);
  const description = normalizeKey(component.component_description);

  return (
    type.includes("FILM") ||
    sku.includes("FILM") ||
    description.includes("FILM")
  );
};

export const addLeadingZero = (value) => {
  const code = normalizeKey(value);
  if (!code || code.startsWith("0")) return code;
  return `0${code}`;
};

export const getMdlzSearchCandidatesForComponent = (component, itemSku = null) => {
  const sku = normalizeKey(itemSku || component.component_sku);
  const candidates = [];

  if (sku) candidates.push(sku);

  if (isMdlzCadComponent(component)) {
    const cadFromSelectedSku = getMdlzCadSearchCode(sku);
    const cadFromComponentSku = getMdlzCadSearchCode(component.component_sku);
    const cadFromDescription = getMdlzCadSearchCode(
      component.component_description
    );

    if (cadFromSelectedSku) candidates.push(cadFromSelectedSku);
    if (cadFromComponentSku) candidates.push(cadFromComponentSku);
    if (cadFromDescription) candidates.push(cadFromDescription);
  }

  if (isMdlzFilmComponent(component)) {
    const withZero = addLeadingZero(sku);
    if (withZero && withZero !== sku) candidates.push(withZero);
  }

  return Array.from(new Set(candidates.filter(Boolean)));
};

export const buildMdlzInventorySearch = (bomComponents) => {
  const items = [];
  const aliases = {};

  (bomComponents || []).forEach((component) => {
    const originalSku = normalizeKey(component.component_sku);
    const candidates = getMdlzSearchCandidatesForComponent(
      component,
      originalSku
    );

    candidates.forEach((candidate) => items.push(candidate));

    if (originalSku && candidates.length > 1) {
      candidates.forEach((candidate) => {
        if (candidate !== originalSku) {
          aliases[originalSku] = candidate;
        }
      });
    }
  });

  return {
    items: Array.from(new Set(items.filter(Boolean))),
    aliases,
  };
};