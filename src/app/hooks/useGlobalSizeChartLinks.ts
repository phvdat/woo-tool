import useSWR from 'swr'
import { endpoint } from '@/constant/endpoint'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useGlobalSizeChartLinks() {
  const { data, isLoading, mutate } = useSWR<string[]>(
    endpoint.globalConfigSizeChartLinks,
    fetcher
  )

  const save = async (payload: string[]) => {
    await fetch(endpoint.globalConfigSizeChartLinks, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    mutate(payload, false)
  }

  return { sizeChartLinks: data || [], isLoading, save }
}