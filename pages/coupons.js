import { Modal, Card, TextField, Checkbox, Button, RadioButton, Stack, Heading, Page } from '@shopify/polaris';
import store from 'store-js';
import Cookies from 'js-cookie';
import '../stylesheets/coupon.css';

class Coupons extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            discounts: {
                freeShipping: {
                    enable: false
                },
                discount15p: {
                    enable: false
                },
                discount25p: {
                    enable: false
                }
            },
            value: 0,
            fixed_type: true,
            minError: false,
            maxError: false,
            minLimit: 1,
            maxLimit: 12,
            isShowChance: false
        }
    }

    componentWillReceiveProps(props) {
        this.setState({
            discounts: props.coupons
        })
    }

    render() {
        const { discounts, minError, maxError, minLimit, maxLimit } = this.state;
        return (
            <div>
                <div className="discount-setting">
                    <Card>
                        <div className="header3">What discounts do you want to offer?</div>
                        <div className="default-discount">
                            <Checkbox checked={this.state.discounts.freeShipping.enable} label="Free Shipping" onChange={this.changeEnable('freeShipping')} />
                        </div>
                        <div className="default-discount">
                            <Checkbox checked={this.state.discounts.discount15p.enable} label="15% Discount" onChange={this.changeEnable('discount15p')} />
                        </div>
                        <div className="default-discount">
                            <Checkbox checked={this.state.discounts.discount25p.enable} label="25% Discount" onChange={this.changeEnable('discount25p')} />
                        </div>
                    </Card>
                </div>
                <div className="discount-add">
                    <Card>
                        <div className="header3">Custom discounts</div>
                        <div className="add-field">
                            <div className="discount-input-field">
                                <TextField value={this.state.value} onChange={this.valueChange} label="" type="number" placeholder="Enter value" />
                            </div>
                                { (this.state.fixed_type)?(
                            <div className="discount-type-group">
                                <Button onClick={() => this.handleType(true)} primary>$ OFF</Button>
                                <Button onClick={() => this.handleType(false)}>% OFF</Button>
                                <img src="/remove.png" className=""/>
                            </div>
                                ):(
                            <div className="discount-type-group">
                                <Button onClick={() => this.handleType(true)}>$ OFF</Button>
                                <Button onClick={() => this.handleType(false)} primary>% OFF</Button>
                                <img src="/remove.png" className=""/>
                            </div>
                                )}
                        </div>
                        <div className="discount-add-link" onClick={() => this.addCoupon()}>+Add one more custom value</div>
                        <div className="discount-custom">
                            {Object.keys(discounts).map(key => {
                                if (key != 'freeShipping' && key != 'discount15p' && key != 'discount25p') {
                                    return (<div>
                                        <div className="coupon-title">{discounts[key].title}</div>
                                        <div className="coupon-delete">
                                            <img src="/remove.png" onClick={() => this.deleteCoupon(key)} />
                                        </div>
                                    </div>)
                                }
                            })}
                        </div>
                    </Card>
                </div>
                <div className="coupon-chance">
                    <Card>
                        <div>
                            <div className="header3">Edit chances</div>
                            {
                                (!this.state.isShowChance)?(
                                    <div className="view-chances" onClick={this.showChances}>View chances</div>
                                ):(
                                    <div className="view-chances" onClick={this.showChances}>Hide chances</div>
                                )
                            }
                        </div>
                        {
                            (this.state.isShowChance)?(
                                <div className="chances-group">
                                    {Object.keys(discounts).map(key => {
                                        if (key != 'freeShipping' && key != 'discount15p' && key != 'discount25p') {
                                            return (<div>
                                                <div className="chance-discount">{discounts[key].title}</div>
                                                <div className="chance-value">
                                                    <TextField onChange={this.chanceChange(key)} label="" type="number" placeholder="Chance" />
                                                </div>
                                            </div>)
                                        }
                                    })}
                                </div>
                            ): (null)
                        }
                        
                    </Card>
                </div>
                <div className="coupon-bottom">
                    <div className="coupon-prev-btn-wrapper">
                        <Button disabled="true" onClick={() => this.nextStep()}>Previous Step</Button>
                    </div>
                    <div className="coupon-next-btn-wrapper">
                        <Button primary onClick={() => this.nextStep()}>Next Step</Button>
                    </div>
                </div>
                <Modal
                    open={minError || maxError} onClose={this.closeModal}
                    title={minError?`Discounts amount must be larger than ${minLimit}!`:`Discounts can not be larger than ${maxLimit}`}
                    primaryAction={{content: 'OK', onAction: this.closeModal}}>
                </Modal>
            </div>
        )
    }

    showChances = () => {
        this.setState({
            isShowChance: !this.state.isShowChance
        })
    }

    closeModal = () => {
        this.setState({
            minError: false,
            maxError: false
        })
    }

    handleType = (value) => {
        this.setState({
            fixed_type: value
        });
    }

    valueChange = (value) => {
        const { fixed_type } = this.state;
        if(fixed_type) {
            if(value >= 0) {
                this.setState({
                    value: value
                })
                return
            }
        } else {
            if(value >=0 && value < 101) {
                this.setState({
                    value: value
                })
                return;
            }
        }
    }

    getLength = (discounts) => {
        var result = 0;
        Object.keys(discounts).map(key => {
            if (discounts[key].enable) {
                result++;
            }
        })
        return result;
    }

    nextStep = () => {
        var { discounts, minLimit, maxLimit } = this.state;
        let discount_no = this.getLength(discounts);
        if (discount_no < minLimit) {
            this.setState({
                minError: true
            })
            return;
        }

        if (discount_no > maxLimit) {
            this.setState({
                maxError: true
            })
            return;
        }

        fetch('https://dev-frontend-trytada.com/updateCoupon', {
            method: 'POST',
            headers: {
                'Content-type': 'application/json'
            },
            body: JSON.stringify({
                discounts,
                id: Cookies.get('widget_id')
            })
        }).then(resp => {
            this.props.next('style');
        })
    }

    deleteCoupon = (key) => {
        var { discounts } = this.state;
        delete discounts[key];
        this.setState({
            discounts
        })
    }

    addCoupon = () => {
        const { fixed_type, value } = this.state;
        var { discounts } = this.state;
        var discount = {
            enable: true,
            type: fixed_type ? 'fixed_amount' : 'percentage',
            value: value
        };
        var key = 'discount' + value;
        var title = ' Discount';
        if (fixed_type) {
            key += 'f';
            title = '$' + value + title;
        } else {
            key += 'p'
            title = value + '%' + title;
        }
        discount.title = title;
        discounts[key] = discount;
        this.setState({
            discounts,
            fixed_type: true,
            value: 0
        });
    }

    changeEnable = (field) => {
        return (checked) => {
            var { discounts } = this.state;
            discounts[field].enable = checked;
            this.setState({
                discounts: discounts
            });
        }
    }

    chanceChange = (key) => {

    }
}

export default Coupons;