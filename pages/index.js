import { ButtonGroup, Button, RadioButton, Stack, Heading, Page } from '@shopify/polaris';
import store from 'store-js';
import '../stylesheets/settings.css';

const img = 'https://cdn.shopify.com/s/files/1/0757/9955/files/empty-state.svg';

class Index extends React.Component {
  state = { displaySetting: 'none' };
  render() {
    return (
      <Page
        title="Settings"
      >
        <div className="display-setting">
          <Heading>Display Setting</Heading>
          <Stack vertical>
            <RadioButton label="None" helpText="App Widget will not be displayed." id="none" name="none" onChange={this.handleDisplayChange} checked={true} />
            <RadioButton label="All Pages" helpText="App Widget will be displayed on all pages." id="all" name="all" onChange={this.handleDisplayChange} />
            <RadioButton label="Product Page" helpText="App Widget will be displayed only on product pages" id="product" name="product" onChange={this.handleDisplayChange} />
          </Stack>
        </div>
        <div className="pricing-plan">
          <Heading>Pricing Plan</Heading>
          <div className="plan-btn-group">
            <Button>Free Plan</Button>
            <Button primary>Premium Plan</Button>
          </div>
        </div>
      </Page>
    );
  }

  handleDisplayChange = (checked, newValue) => {
    this.setState({ displaySetting: newValue });
  }
}

export default Index;
