"use strict";

var React = require("react");

var BModal = require("react-bootstrap/lib/Modal");

var Modal = React.createClass({

    propTypes: {
        onRequestHide: React.PropTypes.func,
    },

    getDefaultProps: function() {
        return {
            onRequestHide: function() { 
                console.log("onRequestHide not overridden");
            }
        };
    },

    componentDidMount: function() {
        this.originalBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        this.pageScrollPosition = [window.scrollX, window.scrollY];
        window.addEventListener("scroll", this.restoreScroll);
    },

    restoreScroll: function() {
        window.scrollTo.apply(window, this.pageScrollPosition);
    },

    componentWillUnmount: function() {
        document.body.style.overflow = this.originalBodyOverflow;
        window.removeEventListener("scroll", this.restoreScroll);
        this.restoreScroll();
    },

    handleHideRequest: function(e) {
        this.props.onRequestHide(e);
    },

    render: function() {

        return (
            <BModal className='Modal' onRequestHide={this.handleHideRequest} title={this.props.title}>
                <div className="modal-scroll">
                    {this.props.children}
                </div>
            </BModal>
        );
    }
});

module.exports = Modal;