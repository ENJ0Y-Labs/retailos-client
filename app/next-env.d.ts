declare module "next" {
  export type Metadata = {
    title?: string
    description?: string
    keywords?: string[]
    authors?: string[]
    creator?: string
    publisher?: string
    images?: {
      url: string
      width?: number
      height?: number
      alt?: string
    }[]
    icons?: string[]
    viewport?: string
    robots?: string
    referrer?: string
    charset?: string
  }
  export interface NextConfig {
    reactStrictMode?: boolean
    trailingSlash?: boolean
    output?: "standalone" | "export"
    [key: string]: any
  }
  export { NextRouter } from "next/router"
  export { Suspense } from "react"
  export { StartTransition } from "react"
}