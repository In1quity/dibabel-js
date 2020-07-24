import React from 'react';
import * as U from '@elastic/eui';
import $ from 'jquery';

export const userUnknown = {};
export const userPending = {};

export class User extends React.Component {
  render() {
    switch (this.props.user) {
      case userPending:
        return <U.EuiLoadingSpinner size="m"/>;
      case userUnknown:
        return <U.EuiHeaderLink href="oauth_api?oauth_login">Login</U.EuiHeaderLink>;
      default:
        return this.props.user;
    }
  }
}

export const getUser = async () => {
  try {
    return await $.get(`oauth_api?login?oauth_identity`);
  } catch (e) {
    return userUnknown;
  }
}
