import React, {useState, useEffect} from 'react'
import {classNames} from 'primereact/utils'
import {FilterMatchMode, FilterOperator} from 'primereact/api'
import {DataTable} from 'primereact/datatable'
import {Column} from 'primereact/column'
import {InputText} from 'primereact/inputtext'
import {MultiSelect} from 'primereact/multiselect'
import {Tag} from 'primereact/tag'
import {TriStateCheckbox} from 'primereact/tristatecheckbox'
import {CustomerService} from './CustomerService'
import {Dropdown} from 'primereact/dropdown'

export default function BasicFilterDemo() {
  const [customers, setCustomers] = useState(null)
  const [filters, setFilters] = useState({
    global: {value: null, matchMode: FilterMatchMode.CONTAINS},
    name: {value: null, matchMode: FilterMatchMode.STARTS_WITH},
    'country.name': {value: null, matchMode: FilterMatchMode.STARTS_WITH},
    representative: {value: null, matchMode: FilterMatchMode.IN},
    status: {value: null, matchMode: FilterMatchMode.EQUALS},
    verified: {value: null, matchMode: FilterMatchMode.EQUALS},
  })
  const [loading, setLoading] = useState(true)
  const [globalFilterValue, setGlobalFilterValue] = useState('')
  const [representatives] = useState([
    {name: 'Amy Elsner', image: 'amyelsner.png'},
    {name: 'Anna Fali', image: 'annafali.png'},
    {name: 'Asiya Javayant', image: 'asiyajavayant.png'},
    {name: 'Bernardo Dominic', image: 'bernardodominic.png'},
    {name: 'Elwin Sharvill', image: 'elwinsharvill.png'},
    {name: 'Ioni Bowcher', image: 'ionibowcher.png'},
    {name: 'Ivan Magalhaes', image: 'ivanmagalhaes.png'},
    {name: 'Onyama Limba', image: 'onyamalimba.png'},
    {name: 'Stephen Shaw', image: 'stephenshaw.png'},
    {name: 'XuXue Feng', image: 'xuxuefeng.png'},
  ])
  const [statuses] = useState([
    'unqualified',
    'qualified',
    'new',
    'negotiation',
    'renewal',
  ])

  const getSeverity = status => {
    switch (status) {
      case 'unqualified':
        return 'danger'

      case 'qualified':
        return 'success'

      case 'new':
        return 'info'

      case 'negotiation':
        return 'warning'

      case 'renewal':
        return null
    }
  }

  useEffect(() => {
    CustomerService.getCustomersMedium().then(data => {
      setCustomers(getCustomers(data))
      setLoading(false)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const getCustomers = data => {
    return [...(data || [])].map(d => {
      d.date = new Date(d.date)

      return d
    })
  }

  const onGlobalFilterChange = e => {
    const value = e.target.value
    let _filters = {...filters}

    _filters['global'].value = value

    setFilters(_filters)
    setGlobalFilterValue(value)
  }

  const renderHeader = () => {
    return (
      <div className="flex justify-content-end">
        <span className="p-input-icon-left">
          <i className="pi pi-search" />
          <InputText
            value={globalFilterValue}
            onChange={onGlobalFilterChange}
            placeholder="Search"
          />
        </span>
      </div>
    )
  }

  const countryBodyTemplate = rowData => {
    return (
      <div className="flex align-items-center gap-2">
        <img
          alt="flag"
          src="https://primefaces.org/cdn/primereact/images/flag/flag_placeholder.png"
          className={`flag flag-${rowData.country.code}`}
          style={{width: '24px'}}
        />
        <span>{rowData.country.name}</span>
      </div>
    )
  }

  const representativeBodyTemplate = rowData => {
    const representative = rowData.representative

    return (
      <div className="flex align-items-center gap-2">
        <img
          alt={representative.name}
          src={`https://primefaces.org/cdn/primereact/images/avatar/${representative.image}`}
          width="32"
        />
        <span>{representative.name}</span>
      </div>
    )
  }

  const representativesItemTemplate = option => {
    return (
      <div className="flex align-items-center gap-2">
        <img
          alt={option.name}
          src={`https://primefaces.org/cdn/primereact/images/avatar/${option.image}`}
          width="32"
        />
        <span>{option.name}</span>
      </div>
    )
  }

  const statusBodyTemplate = rowData => {
    return <Tag value={rowData.status} severity={getSeverity(rowData.status)} />
  }

  const statusItemTemplate = option => {
    return <Tag value={option} severity={getSeverity(option)} />
  }

  const verifiedBodyTemplate = rowData => {
    return (
      <i
        className={classNames('pi', {
          'true-icon pi-check-circle': rowData.verified,
          'false-icon pi-times-circle': !rowData.verified,
        })}
      ></i>
    )
  }

  const representativeRowFilterTemplate = options => {
    return (
      <MultiSelect
        value={options.value}
        options={representatives}
        itemTemplate={representativesItemTemplate}
        onChange={e => options.filterApplyCallback(e.value)}
        optionLabel="name"
        placeholder="Any"
        className="p-column-filter"
        maxSelectedLabels={1}
        style={{minWidth: '14rem'}}
      />
    )
  }

  const statusRowFilterTemplate = options => {
    return (
      <Dropdown
        value={options.value}
        options={statuses}
        onChange={e => options.filterApplyCallback(e.value)}
        itemTemplate={statusItemTemplate}
        placeholder="Select One"
        className="p-column-filter"
        showClear
        style={{minWidth: '12rem'}}
      />
    )
  }

  const verifiedRowFilterTemplate = options => {
    return (
      <TriStateCheckbox
        value={options.value}
        onChange={e => options.filterApplyCallback(e.value)}
      />
    )
  }

  const header = renderHeader()

  return (
    <div className="card">
      <DataTable
        value={customers}
        paginator
        rows={10}
        dataKey="id"
        filters={filters}
        filterDisplay="row"
        loading={loading}
        globalFilterFields={[
          'name',
          'country.name',
          'representative.name',
          'status',
        ]}
        header={header}
        emptyMessage="No customers found."
      >
        <Column
          field="name"
          header="Name"
          filter
          filterPlaceholder="Search by name"
          style={{minWidth: '12rem'}}
        />
        <Column
          header="Country"
          filterField="country.name"
          style={{minWidth: '12rem'}}
          body={countryBodyTemplate}
          filter
          filterPlaceholder="Search by country"
        />
        <Column
          header="Agent"
          filterField="representative"
          showFilterMenu={false}
          filterMenuStyle={{width: '14rem'}}
          style={{minWidth: '14rem'}}
          body={representativeBodyTemplate}
          filter
          filterElement={representativeRowFilterTemplate}
        />
        <Column
          field="status"
          header="Status"
          showFilterMenu={false}
          filterMenuStyle={{width: '14rem'}}
          style={{minWidth: '12rem'}}
          body={statusBodyTemplate}
          filter
          filterElement={statusRowFilterTemplate}
        />
        <Column
          field="verified"
          header="Verified"
          dataType="boolean"
          style={{minWidth: '6rem'}}
          body={verifiedBodyTemplate}
          filter
          filterElement={verifiedRowFilterTemplate}
        />
      </DataTable>
    </div>
  )
}
