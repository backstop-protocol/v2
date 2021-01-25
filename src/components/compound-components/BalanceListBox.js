import React, {Component} from "react";
import {observer} from "mobx-react"
import styled from "styled-components"
import CoinListHeader from "./CoinListHeader"
import CoinList from "./CoinList"
import compoundStore from "../../stores/compound.store"

const Container = styled.div`
    width: 610px;
    border-radius: 12px;
    box-shadow: 0 0 6px 0 rgba(0, 0, 0, 0.22);
    border-style: solid;
    border-width: 0.5px;
    border-image-source: linear-gradient(to bottom, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.4) 5%, rgba(255, 255, 255, 0) 20%, rgba(255, 255, 255, 0));
    border-image-slice: 1;
    margin: 0 20px;
    background: white;
`



class BalanceListBox extends Component {

    render () {
        const {list, type} = this.props        
        return (
            <Container>
                <CoinListHeader/>
                <CoinList type={type} isInBalanceBox={true} list={list}/>
            </Container>
        )
    }
}

export default observer(BalanceListBox)