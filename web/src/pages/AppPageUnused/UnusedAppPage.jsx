//import "./App.css";

const readBigJSON = async temp1 => {
  const one = await temp1.slice(0, temp1.size / 4, 'text/utf-8').text()
  const two = await temp1
    .slice(temp1.size / 4, (2 * temp1.size) / 4, 'text/utf-8')
    .text()
  const three = await temp1
    .slice((2 * temp1.size) / 4, (3 * temp1.size) / 4, 'text/utf-8')
    .text()
  const four = await temp1
    .slice((3 * temp1.size) / 4, (4 * temp1.size) / 4, 'text/utf-8')
    .text()
  return JSON.parse(one + two + three + four)
}

function downloadData(data, filename, contentType = 'text/html') {
  if (!data) {
    console.error('Console.save: No data')
    return
  }

  if (!filename) {
    console.error('Console.save: No filename')
  }

  if (typeof data === 'object') {
    data = JSON.stringify(data)
  }

  var blob = new Blob([data], {type: contentType}),
    e = document.createEvent('MouseEvents'),
    a = document.createElement('a')

  a.download = filename
  a.href = window.URL.createObjectURL(blob)
  a.dataset.downloadurl = [contentType, a.download, a.href].join(':')
  e.initMouseEvent(
    'click',
    true,
    false,
    window,
    0,
    0,
    0,
    0,
    0,
    false,
    false,
    false,
    false,
    0,
    null,
  )
  a.dispatchEvent(e)
}

const downloadPdfLink = async url => {
  const response = await window.fetch(url, {})
  const contentType = 'application/pdf'
  const filename = url.substring(url.lastIndexOf('/') + 1)

  const arrayBuffer = await response.arrayBuffer()
  const blob = new Blob([arrayBuffer], {type: contentType})
  const objectUrl = URL.createObjectURL(blob)
  var e = document.createEvent('MouseEvents'),
    a = document.createElement('a')

  a.download = filename
  a.href = objectUrl
  a.dataset.downloadurl = [contentType, a.download, a.href].join(':')
  e.initMouseEvent(
    'click',
    true,
    false,
    window,
    0,
    0,
    0,
    0,
    0,
    false,
    false,
    false,
    false,
    0,
    null,
  )
  a.dispatchEvent(e)
}

const now = new Date('2023-12-31').getTime()

const filterActiveMembers = allData =>
  allData.filter(
    cur => new Date(cur.member_data?.expiration_date ?? 0).getTime() >= now,
  )

const getAllClassifierRunsForDivision = (whichDivision /*number*/, allData) =>
  allData
    .map(member => {
      const memberNumber = member.member_data?.member_number
      if (!memberNumber) {
        console.log('no member')
        return null
      }

      const selectedDivision = member.classifiers?.filter(
        shitBucket => shitBucket.division_id === whichDivision,
      )?.[0]?.division_classifiers
      if (!selectedDivision) {
        return null
      }

      return selectedDivision
        .map(curClassifier => {
          const {
            classifier,
            sd,
            clubid,
            club_name,
            percent: percentRaw,
            hf: hfRaw,
            code,
            source,
          } = curClassifier
          const percent = Number(percentRaw)
          const hf = Number(hfRaw)
          if (Number.isNaN(percent)) {
            console.log(JSON.stringify(curClassifier, null, 2))
            return null
          }

          return {
            classifier,
            sd,
            clubid,
            club_name,
            percent: Number.isNaN(percent) ? -1 : percent,
            hf: Number.isNaN(hf) ? -1 : hf,
            code,
            source,
            memberNumber,
          }
        })
        .filter(Boolean)
    })
    .filter(Boolean)
    .flat()

const splitDivisions = async event => {
  try {
    const data = await readBigJSON(event.target.files[0])
    downloadData(
      getAllClassifierRunsForDivision(2, data),
      'merged.active.open.json',
      'application/json',
    )
    downloadData(
      getAllClassifierRunsForDivision(3, data),
      'merged.active.limited.json',
      'application/json',
    )
    downloadData(
      getAllClassifierRunsForDivision(4, data),
      'merged.active.limited10.json',
      'application/json',
    )
    downloadData(
      getAllClassifierRunsForDivision(5, data),
      'merged.active.production.json',
      'application/json',
    )
    downloadData(
      getAllClassifierRunsForDivision(6, data),
      'merged.active.revolver.json',
      'application/json',
    )
    downloadData(
      getAllClassifierRunsForDivision(7, data),
      'merged.active.singlestack.json',
      'application/json',
    )
    downloadData(
      getAllClassifierRunsForDivision(38, data),
      'merged.active.pcc.json',
      'application/json',
    )
    downloadData(
      getAllClassifierRunsForDivision(41, data),
      'merged.active.limitedoptics.json',
      'application/json',
    )
  } catch (fuck) {
    console.log(fuck)
  }
}

function App() {
  return (
    <>
      <div className="card">
        <input
          type="file"
          name="myFile"
          onChange={async event => {
            try {
              const data = await readBigJSON(event.target.files[0])
              const shit = data.classifiers.map(cur => cur.link)
              console.log(shit.count)
              console.log(JSON.stringify(shit))
              //data.classifiers.forEach(cur => downloadPdfLink(cur.link))
            } catch (fuck) {
              console.log(fuck)
            }
          }}
        />
      </div>
    </>
  )
}

const selectOneClassifier = (whichClassifierAsString, divisionData) => {
  const nonEmptyData = divisionData.filter(Boolean)
  const wishYouWereHere = nonEmptyData
    .filter(run => run.classifier === '20-01')
    .filter(run => Number(run.hf) > 0)
    .sort((a, b) => Number(a.hf) - Number(b.hf))
  console.log(wishYouWereHere.length)
  debugger
}

export default App
