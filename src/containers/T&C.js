import React, { Component } from 'react';

import Sidebar from '../components/Sidebar';

export default class TandC extends Component {
  render() {
    const { handleItemChange, history } = this.props;
    return (
      <div className="App">
        <Sidebar
          handleItemChange={handleItemChange}
          history={history}
          initialState="terms"
        />
        <div className="item-page-content">
          <div className="menu-item-header">
            <h1 className="item-header-title">Terms of use</h1>
          </div>
        </div>
      </div>
    );
  }
}
