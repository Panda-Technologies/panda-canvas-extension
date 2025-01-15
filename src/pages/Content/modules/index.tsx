/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import ReactDOM from 'react-dom';
import App from './components/App';
import { Options } from './types';
import { LMSConfig } from './types/config';

/*
  render app function
*/

export default function runApp(
  container: HTMLElement,
  lms: LMSConfig,
  data: Options
): void {
  // ReactDOM.render(
  //   <React.StrictMode>
  //     <App lms={lms} options={data} />
  //   </React.StrictMode>,
  //   container
  // );
  
}
