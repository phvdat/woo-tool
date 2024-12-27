import {
  LenfuLOrdersSheet,
  TrackingOrderCombined,
} from '@/app/(page)/tracking-checker/TrackingChecker';
import { isEmpty } from 'lodash';

// hàm làm sạch dữ liêu
export function cleanData(data: LenfuLOrdersSheet[]): LenfuLOrdersSheet[] {
  // remove design sku empty
  const result = data.filter((item) => !isEmpty(item.design_sku.trim()));
  return result;
}
export function getUniqueStores(data: LenfuLOrdersSheet[]): string[] {
  const uniqueStores = new Set();
  data.forEach((item) => {
    uniqueStores.add(item.store_name);
  });

  return Array.from(uniqueStores) as string[];
}

export function getRecordByStores(
  data: TrackingOrderCombined[],
  stores: string[]
) {
  const result = data.filter((item) =>
    stores.find((store) => store === item.store_name)
  );
  return result;
}
