import { TextField, Button, RadioButton, Stack, Heading, Page } from '@shopify/polaris';
import store from 'store-js';
import '../stylesheets/settings.css';

const img = 'https://cdn.shopify.com/s/files/1/0757/9955/files/empty-state.svg';

class Index extends React.Component {
  state = { displaySetting: 'all', timer: -1, pricingPlan: "free" };
  render() {
    return (
      <Page
        title="Settings"
      >
        <div className="display-setting">
          <Heading>Display Setting</Heading>
          <Stack vertical>
            <RadioButton label="None" helpText="App Widget will not be displayed." id="none" name="none" onChange={this.handleDisplayChange} checked={state.displaySetting === 'none'} />
            <RadioButton label="All Pages" helpText="App Widget will be displayed on all pages." id="all" name="all" onChange={this.handleDisplayChange}  checked={state.displaySetting === 'all'}/>
            <RadioButton label="Product Page" helpText="App Widget will be displayed only on product pages" id="product" name="product" onChange={this.handleDisplayChange} checked={state.displaySetting === 'product'} />
          </Stack>
          <TextField value={this.state.timer} onChange={this.timerChange('timer')} label="Timer Value" type="number" />
        </div>
        <div className="frequency-setting">
          <Heading>How often display widget</Heading>
          <Stack horizontal>
            <TextField value={this.state.frequencyDay} onChange={this.timerChange('frequencyDay')} label="Days" type="number" />
            <TextField value={this.state.frequencyHour} onChange={this.timerChange('frequencyHour')} label="Hours" type="number" />
            <TextField value={this.state.frequencyMin} onChange={this.timerChange('frequencyMin')} label="Mins" type="number" />
          </Stack>
        </div>
        <div className="pricing-plan">
          <Heading>Pricing Plan</Heading>
          <div className="plan-btn-group">
            <Stack vertical>
              <RadioButton label="Free Plan" helpText="$0, 500 times free" id="free" name="free" onChange={this.handlePricingChange} checked={this.state.pricingPlan === 'free'} />
              <RadioButton label="Premium Plan" helpText="$19.99/month, unlimited times" id="premium" name="premium" onChange={this.handlePricingChange} checked={this.state.pricingPlan === "premium"} />
            </Stack>
          </div>
        </div>
      </Page>
    );
  }

  handleDisplayChange = (checked, newValue) => {
    this.setState({ displaySetting: newValue });
  }

  timerChange = (field) => {
    return (value) => this.setState({[field]: value})
  }

  handlePricingChange = (checked, newValue) => {
    this.setState({ pricingPlan: newValue });
  }
}

export default Index;
