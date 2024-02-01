import {TabView, TabPanel} from 'primereact/tabview'
import {divisions} from '../../../data/division.json'
import {useEffect, useState} from 'react'
import {useParams} from 'react-router-dom'

export const Row = ({children}) => (
  <div
    style={{display: 'flex', flexDirection: 'row', justifyContent: 'center'}}
  >
    {children}
  </div>
)

export const Column = ({children}) => (
  <div
    style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}
  >
    {children}
  </div>
)

export const DivisionNav = ({onSelect}) => {
  const {division} = useParams()
  const [activeIndex, setActiveIndex] = useState(
    divisions.findIndex(
      c => c?.short_name?.toLowerCase() === (division || 'invalid'),
    ),
  )

  // call parent when division selection changes
  useEffect(
    () => onSelect?.(divisions[activeIndex]?.short_name?.toLowerCase?.()),
    [activeIndex, onSelect],
  )

  // update selection if navigation changes
  useEffect(() => {
    setActiveIndex(
      divisions.findIndex(
        c => c?.short_name?.toLowerCase() === (division || 'invalid'),
      ),
    )
  }, [division, setActiveIndex])

  return (
    <div>
      <TabView
        panelContainerStyle={{padding: 0}}
        activeIndex={activeIndex}
        onTabChange={e => {
          setActiveIndex(e.index)
        }}
      >
        {divisions.map(division => (
          <TabPanel key={division.id} header={division.long_name} />
        ))}
      </TabView>
      {activeIndex < 0 && (
        <div style={{display: 'flex', justifyContent: 'center'}}>
          Select Division to Start
        </div>
      )}
    </div>
  )
}
