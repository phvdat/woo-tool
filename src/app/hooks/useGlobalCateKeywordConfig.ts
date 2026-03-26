import useSWR from 'swr'
import { endpoint } from '@/constant/endpoint'

type CateKeyword = Record<string, string[]>

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useGlobalCateKeywordConfig() {
  const { data, isLoading, mutate } = useSWR<CateKeyword>(endpoint.globalConfigCateKeyword, fetcher)

  const save = async (payload: CateKeyword) => {
    await fetch(endpoint.globalConfigCateKeyword, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    mutate(payload, false)
  }

  return { cateKeyword: data || {}, isLoading, save }
}