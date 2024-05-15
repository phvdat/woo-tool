'use client';
import { PropsWithChildren } from 'react';
import { SWRConfig } from 'swr';

interface SWRProviderProps extends PropsWithChildren {
  fallback: any;
}
export const SWRProvider = ({ children, fallback }: SWRProviderProps) => {
  return <SWRConfig value={{ fallback }}>{children}</SWRConfig>;
};
