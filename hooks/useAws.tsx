import * as React from 'react'
import { GiConsoleController } from 'react-icons/gi'

export const useAws = () => {
  const [services, setServices] = React.useState<string[]>([])
  const [servicesLoading, setServicesLoading] = React.useState<boolean>(false)
  const [specsLoading, setSpecsLoading] = React.useState<{[key: string] : boolean}>({})
  const [costLoading, setCostLoading] = React.useState<boolean>(false)

  const fetchServices = async () => {
    try {
      setServicesLoading(true)
      const response = await fetch('/api/services')
      const data = await response.json()
      setServices(data.data)
    } catch (error) {
      console.error(error)
    } finally {
      setServicesLoading(false)
    }
  }

  const fetchServiceSpecs = async (service: string, attribute: string) => {
    try {
      setSpecsLoading((prev) => ({ ...prev, [attribute]: true }))
      const response = await fetch(`/api/specs?service=${service}&attribute=${attribute}`)
      const data = await response.json()
      console.log(data)
      return data.values
    } catch (error) {
      console.error(error)
      return []
    } finally {
      setSpecsLoading((prev) => ({ ...prev, [attribute]: false }))
    }
  }

  const fetchServiceAttributes = async (service: string) => {
    try {
      const response = await fetch(`/api/services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ service })
      })
      const data = await response.json()
      return data.values
    } catch (error) {
      console.error(error)
      return []
    }
  }

  const fetchServiceCost = async (service: string, attribute: {[key: string]: string}) => {
    try {
      setCostLoading(true)
      const response = await fetch('/api/costs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          service,
          attribute,
        })
      });
  
      const data = await response.json();
      return data.data;
      
    } catch (error) {
      console.error(error);
      return null;
    } finally {
      setCostLoading(false);
    }
  };


  return { services, servicesLoading, specsLoading, costLoading, fetchServices, fetchServiceSpecs, fetchServiceAttributes, fetchServiceCost }
}
