"use strict";

import * as React from 'react';

import { Button } from 'react-bootstrap';

export default (props) => {
    return (<Button bsSize='small' bsStyle='success' style={{marginLeft: 3, marginRight: 3}} {...props} >{props.children}</Button> );
};

  