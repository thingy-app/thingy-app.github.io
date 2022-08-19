import './thingy-app.css';
import * as React from "react"
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import {Thingy} from './util/thingy.js';
/* https://github.com/jtguggedal/thingy_web_bluetooth */
import Plot from 'react-plotly.js';
//import Loadable from 'react-loadable'

/*const Plot = Loadable({
  loader: () => import(`react-plotly.js`),
  loading: ({ timedOut }) =>
    timedOut ? (
      <blockquote>Error: Loading Plotly timed out.</blockquote>
    ) : (
      <div>Loading plotly...</div>
    ),
  timeout: 30000,
})*/

const ThingyApp = () => {
  React.useEffect(() => {
    document.title = 'thingy-app';
  });
  const [thingy] = React.useState(new Thingy({logEnabled: true}));
  const [connected, setConnected] = React.useState(thingy.isConnected());
  const [info, setInfo] = React.useState("Connect your thingy52 to get started.");
  const [freq, setFreq] = React.useState(0);
  const windowSize = 15; // seconds
  const samplingFrequency = 100; // assuming always 100Hz for now
  const windowNSamples = windowSize*samplingFrequency;
  const zeros = new Array(windowNSamples).fill(0); // empty array
  const [motionDataWindow, setMotionDataWindow] = React.useState({
    acc: {x: zeros.slice(), y: zeros.slice(), z: zeros.slice()}, // slice will create copies of initial array, so they're all different arrays.
    gyr: {x: zeros.slice(), y: zeros.slice(), z: zeros.slice()},
    time: Array.from(Array(windowNSamples).keys()) // plotly requires different arrays on x-axis even if they're the same to update properly - this array needs to be cloned for each use
  });
  const [pythonLoaded, setPythonLoaded] = React.useState(false); 
  const onPythonLoaded = () => {
    console.log('Python callback triggered.')
    setPythonLoaded(true)
    console.log(document.test({x: [86, 98]}))
  }
  document.onPythonLoaded = onPythonLoaded;
  const connectDisconnectThingy = async () => {
    const isConnected = thingy.isConnected();
    if (!isConnected) { 
      try { // connect
        setInfo("Attempting to connect..."); 
        await thingy.connect(); 
      } catch (e) {
        console.log("connect error: " + e);
      }
    } else {
     try { // disconnect
       setInfo("Attempting to disconnect..."); 
       await thingy.disconnect(); 
     } catch (e) {
        console.log("disconnect error: " + e);
     }
    }
    // update UI
    const new_isConnected = thingy.isConnected();
    setConnected(new_isConnected);
    if (!!(new_isConnected !== isConnected)) { // status changed -> success
      setInfo(new_isConnected ? `Thingy (${await thingy.getName()}) connected.` : "Thingy disconnected.");
    } else { // status same -> failure
      setInfo(new_isConnected ? "Thingy failed to disconnect." : "Thingy failed to connect.");
    }
    if(new_isConnected) thingy.addDisconnectListener(() => {setConnected(false); setInfo("Thingy abruptly disconnected.")}, true);
  }
  const updateArrayWithNewSample = (array, newSample) => {
    array.shift(); // drop first sample
    array.push(newSample); // add new sample to end
    return array;
  }
  const startObservingMotion = async () => {
    const config = await thingy.getMotionConfig();
    setFreq(config.motionProcessingFrequency);
    const updateMotionData = (data) => {
      // setMotionData(data);
      // Add data to list so far
      const newData = {
        acc: {x: updateArrayWithNewSample(motionDataWindow.acc.x, data.accelerometer.x),
              y: updateArrayWithNewSample(motionDataWindow.acc.y, data.accelerometer.y),
              z: updateArrayWithNewSample(motionDataWindow.acc.z, data.accelerometer.z),
            },
        gyr: {x: updateArrayWithNewSample(motionDataWindow.gyr.x, data.gyroscope.x),
              y: updateArrayWithNewSample(motionDataWindow.gyr.y, data.gyroscope.y),
              z: updateArrayWithNewSample(motionDataWindow.gyr.z, data.gyroscope.z),
        },
        time: updateArrayWithNewSample(motionDataWindow.time, motionDataWindow.time[windowNSamples-1] + 1),
      }
      setMotionDataWindow(newData);
    }
    await thingy.motionRawEnable(updateMotionData, false); // in case already added handler previously
    await thingy.motionRawEnable(updateMotionData, true);
  }
  const trace_acc_x = {
    x: Array.from(motionDataWindow.time),
    y: motionDataWindow.acc.x,
    type: 'scatter',
    mode: 'lines',
    marker: {color: 'blue'},
    name: "acc_X",
  }
  const trace_acc_y = {
    x: Array.from(motionDataWindow.time),
    y: motionDataWindow.acc.y,
    type: 'scatter',
    mode: 'lines',
    marker: {color: 'red'},
    name: "acc_Y",
  }
  const trace_acc_z = {
    x: Array.from(motionDataWindow.time),
    y: motionDataWindow.acc.z,
    type: 'scatter',
    mode: 'lines',
    marker: {color: 'green'},
    name: "acc_Z",
  }
  const trace_gyr_x = {
    x: Array.from(motionDataWindow.time),
    y: motionDataWindow.gyr.x,
    type: 'scatter',
    mode: 'lines',
    marker: {color: 'blue'},
    name: "gyr_X",
  }
  const trace_gyr_y = {
    x: Array.from(motionDataWindow.time),
    y: motionDataWindow.gyr.y,
    type: 'scatter',
    mode: 'lines',
    marker: {color: 'red'},
    name: "gyr_Y",
  }
  const trace_gyr_z = {
    x: Array.from(motionDataWindow.time),
    y: motionDataWindow.gyr.z,
    type: 'scatter',
    mode: 'lines',
    marker: {color: 'green'},
    name: "gyr_Z",
  }
  const pythonScripts = (
    <div>
      {React.createElement("py-env", {}, `
        - numpy
        - pandas
        - SciPy 
        - scikit-learn
      `)}
      {React.createElement("py-script", {src: '/python.py'})}
    </div>
  );
  const loadPython = () => {
    if (!!document.getElementById('pyscript')) return; // only load it once
    const s = document.createElement('script');
    s.id = 'pyscript';
    s.src = 'https://pyscript.net/alpha/pyscript.js';
    s.defer = true;
    document.head.appendChild(s);
  }
  return (
    <div className="thingy-app-container">
      {pythonScripts}
      {loadPython()}
      <main style={{backgroundColor: "#E7EBF0", color: "#232129", padding: 24, fontFamily: "-apple-system, Roboto, sans-serif, serif"}}>
        <h1 style={{marginTop: 0}}>thingy-app</h1>
        <h2 style={{color: "#663399"}}>live motion data viewer<br />over BLE</h2>
        <Button variant="contained" onClick={connectDisconnectThingy}>{connected ? "Disconnect" : "Connect Thingy52"}</Button>
        <div style={{marginTop: 8, color: "grey"}}>{info}</div>
        <p style={{color: "#663311", fontSize: 12}}>(Browser/computer with Bluetooth Low Energy (BLE) support required - Chrome on android/win10 recommended)<br />(Motion processing frequency setting in thingy52 can be updated using official <a href="https://developer.nordicsemi.com/thingy/52">demo web app</a>.)</p>
        <br />
        <Button variant="outlined" disabled={(connected && pythonLoaded) ? false : true} onClick={startObservingMotion}>{pythonLoaded ? 'Start observing motion data' : 'Python script loading...'}</Button>
        <br />
        <br />
        <div>Sampling frequency: {freq} Hz</div>
        <br />
        <br />
        <Card sx={{ minWidth: 275 }}>
          <CardContent>
            <Plot
              data={[trace_acc_x, trace_acc_y, trace_acc_z]}
              layout={{autosize: true, title: 'Linear Acceleration', /*yaxis: {range: [-30, 30]}*/}}
              useResizeHandler
              style={{width: '100%', height: 300}}
            />
          </CardContent>
        </Card>
        <br />
        <Card sx={{ minWidth: 275 }}>
          <CardContent>
            <Plot
              data={[trace_gyr_x, trace_gyr_y, trace_gyr_z]}
              layout={{autosize: true, title: 'Angular Velocity (Gyroscope)',}} 
              useResizeHandler
              style={{width: '100%', height: 300}}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default ThingyApp;

/*
// pyscript css ommited - buggy
{React.createElement("link", {rel: "stylesheet", href: "https://pyscript.net/alpha/pyscript.css"})} // this css causes UI bugs
*/