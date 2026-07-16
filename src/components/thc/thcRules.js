export const THC_RULES = {
  customer: "THC",
  sourceType: "PDF",

  finishedProductShelfLifeDays: 360,

  minimumRemainingShelfLifeDays: 150,

  minimumCustomerShipmentDays: 90,

  productAssemblyTypes: ["PRODUCT", "FEEDSTOCK", "CANDY"],

  packagingAssemblyDefaultType: "OTHER",
};

export function isThcShelfLifeComponent(component = {}) {
  const text = [
    component.type,
    component.component_description,
    component.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();

  return (
    text.includes("CANDY") ||
    text.includes("HEATH") ||
    text.includes("PRODUCT") ||
    text.includes("FEEDSTOCK")
  );
}

export function getThcMinimumRemainingDays(component = {}) {
  return isThcShelfLifeComponent(component)
    ? THC_RULES.minimumRemainingShelfLifeDays
    : null;
}