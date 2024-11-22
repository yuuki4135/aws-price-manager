export type specType = {
  [key: string]: contant
}

export type contant = {
  instanceTypes? : {
    label: string,
    value: string,
    vcpu: number,
    memory: string
  }[],
  regions?: {
    label: string,
    value: string
  }[],
  storageTypes?: {
    label: string,
    value: string
  }[],
  engineTypes?: {
    label: string,
    value: string
  }[],
}

