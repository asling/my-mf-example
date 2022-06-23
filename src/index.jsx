import ReactDOM from 'react-dom';
import React, { Suspense } from 'react';
import { Main } from './main.jsx';
const AboutUs = React.lazy(() =>
  import(/* webpackChunkName: "aboutUs" */ './aboutUs.jsx'));
import { Contact } from './contact.jsx';
import { BrowserRouter, Route, Link } from "react-router-dom";

ReactDOM.render(
  <BrowserRouter>
    <div>
      <div className="logo">
        <img src={logo} alt=""/>
      </div>
      <div className="links">
        <Link to="/">Main</Link> | <Link to="/aboutUs">About Us</Link> | <Link to="/contact">Contact</Link>
      </div>
    </div>
    <Route path="/" exact component={Main} />
    <Route path="/aboutUs" exact component={() =>
      <Suspense fallback={<div>Loading...</div>}>
        <AboutUs />
      </Suspense>
    } />
    <Route path="/contact" exact component={Contact} />
  </BrowserRouter>,
  document.getElementById('root')
);
