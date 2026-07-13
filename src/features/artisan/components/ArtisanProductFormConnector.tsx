import type { ComponentProps, Dispatch, SetStateAction } from "react";
import type { ArtisanProductInput } from "../../../types/artisan";

import { ArtisanProductFormSection } from "./ArtisanProductFormSection";

type FormSectionProps = ComponentProps<typeof ArtisanProductFormSection>;
type ForwardedProps = Omit<
  FormSectionProps,
  | "onAddAttribute"
  | "onAvailabilityModeChange"
  | "onCategoryChange"
  | "onDescriptionChange"
  | "onLeadTimeDaysChange"
  | "onPriceChange"
  | "onRemoveAttribute"
  | "onStockQuantityChange"
  | "onTitleChange"
  | "onToggleActive"
  | "onUpdateAttribute"
  | "onUpdateMadeToOrderOptions"
>;

type ArtisanProductFormConnectorProps = ForwardedProps & {
  setProductForm: Dispatch<SetStateAction<ArtisanProductInput>>;
};

export function ArtisanProductFormConnector({
  setProductForm,
  ...props
}: ArtisanProductFormConnectorProps) {
  return (
    <ArtisanProductFormSection
      {...props}
      onAddAttribute={(initialKey) => {
        setProductForm((current) => ({
          ...current,
          product_attributes: [
            ...current.product_attributes,
            { key: initialKey ?? "", value: "" },
          ],
        }));
      }}
      onAvailabilityModeChange={(value) => {
        setProductForm((current) => ({
          ...current,
          availability_mode: value,
          lead_time_days: value === "made_to_order" ? current.lead_time_days ?? 7 : null,
          stock_quantity: value === "stock" ? Math.max(1, current.stock_quantity ?? 1) : null,
        }));
      }}
      onCategoryChange={(category_id) => {
        setProductForm((current) => ({ ...current, category_id }));
      }}
      onDescriptionChange={(description) => {
        setProductForm((current) => ({ ...current, description }));
      }}
      onLeadTimeDaysChange={(lead_time_days) => {
        setProductForm((current) => ({ ...current, lead_time_days }));
      }}
      onPriceChange={(price) => {
        setProductForm((current) => ({ ...current, price }));
      }}
      onRemoveAttribute={(index) => {
        setProductForm((current) => ({
          ...current,
          product_attributes: current.product_attributes.filter(
            (_attribute, attributeIndex) => attributeIndex !== index,
          ),
        }));
      }}
      onStockQuantityChange={(stock_quantity) => {
        setProductForm((current) => ({ ...current, stock_quantity }));
      }}
      onTitleChange={(title) => {
        setProductForm((current) => ({ ...current, title }));
      }}
      onToggleActive={(is_active) => {
        setProductForm((current) => ({ ...current, is_active }));
      }}
      onUpdateAttribute={(index, field, value) => {
        setProductForm((current) => ({
          ...current,
          product_attributes: current.product_attributes.map((attribute, attributeIndex) =>
            attributeIndex === index ? { ...attribute, [field]: value } : attribute,
          ),
        }));
      }}
      onUpdateMadeToOrderOptions={(made_to_order_options) => {
        setProductForm((current) => ({ ...current, made_to_order_options }));
      }}
    />
  );
}
