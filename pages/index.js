import { Link, TextField, Checkbox, Button, RadioButton, Stack, Heading, Page } from '@shopify/polaris';
import store from 'store-js';
import Cookies from 'js-cookie';
import '../stylesheets/settings.css';

class Index extends React.Component {
  state = { displaySetting: '', timer: 0, pricingPlan: "", frequencyDay: 0, frequencyHour: 0, frequencyMin: 0, showPeriod: false, frequency: '', saveDisabled: true, exitIntent: true, exitIntentTime: 5 };

  componentDidMount = () => {
    fetch(`https://app.trytada.com/getSetting`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        shop: Cookies.get('shopOrigin')
      })
    }).then(resp => resp.json())
    .then(json => {
      console.log(json);
    });
    fetch(`https://app.trytada.com/getSetting`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        shop: Cookies.get('shopOrigin')
      })
    })
    .then(resp => resp.json())
    .then(json => {
      if(json.error) {
        return;
      }
      if(json) {
        var frequencyDay = Math.floor(json.displayFrequency/(24*60*60*1000));
        var frequencyHour = Math.floor((json.displayFrequency - frequencyDay * (24* 60 * 60 * 1000))/(60*60*1000));
        var frequencyMin = Math.floor((json.displayFrequency - frequencyDay * (24*60*60) - frequencyHour * (60 * 60 * 1000))/(60 * 1000));
        var pricingPlan = 'free';
        if(json.pricingPlan == 1) {
          pricingPlan = "premium";
        }
        var showPeriod = false;
        if(json.frequency == 'period') {
          showPeriod = true;
        }

        this.setState({
          displaySetting: json.displaySetting,
          frequencyDay,
          frequencyHour,
          frequencyMin,
          timer: json.timer,
          pricingPlan,
          frequency: json.frequency,
          showPeriod,
          exitIntent: json.exitIntent,
          exitIntentTime: json.exitIntentTime
        });
      }
    });
  }

  render() {
    return (
      <Page
        title="Settings"
      >
        <div className="display-setting">
          <Heading>Display Setting</Heading>
          <Stack vertical>
            <RadioButton label="None" helpText="App Widget will not be displayed." id="none" name="none" onChange={this.handleDisplayChange} checked={this.state.displaySetting === 'none'} />
            <RadioButton label="All Pages" helpText="App Widget will be displayed on all pages." id="all" name="all" onChange={this.handleDisplayChange}  checked={this.state.displaySetting === 'all'}/>
            <RadioButton label="Product Page" helpText="App Widget will be displayed only on product pages" id="product" name="product" onChange={this.handleDisplayChange} checked={this.state.displaySetting === 'product'} />
            <RadioButton label="Specific Page" helpText="App Widget will be displayed only on specific pages" id="specific" name="specific" onChange={this.handleDisplayChange} checked={this.state.displaySetting === 'specific'} />
            { (this.state.displaySetting === 'specific')?(
              <div className="subsetting">
                <Link url="/selectPages">Select Specific Pages</Link>
              </div>
            ):(null) }
          </Stack>

          <TextField value={this.state.timer} onChange={this.timerChange('timer')} label="Timer Value" type="number" />
        </div>
        <div className="frequency-setting">
          <Heading>How often display widget</Heading>
          <Stack vertical>
            <RadioButton label="Every Time" helpText="Game modal will show every time" id="every" name="every" onChange={this.handleFrequency} checked={this.state.frequency === "every"} />
            { (this.state.frequency === "every")?(
                <div className="exit-intent">
                  <Checkbox checked={this.state.exitIntent} label="On Desktop - Only show when visitor are about to exit the page" onChange={this.handleExitIntent} />
                  {(this.state.exitIntent)?(
                    <div>
                      <TextField value={this.state.exitIntentTime} onChange={this.timerChange('exitIntentTime')} label="Period for displaying Exit Intent" type="number" />
                    </div>
                  ):(null)}
                </div>
          ):(null)
            }
            <RadioButton label="One Time" helpText="Game will show only once per user." id="one" name="one" onChange={this.handleFrequency} checked={this.state.frequency === 'one'} />
            { (this.state.frequency === "one")?(
                <div className="exit-intent">
                  <Checkbox checked={this.state.exitIntent} label="On Desktop - Only show when visitor are about to exit the page" onChange={this.handleExitIntent} />
                  {(this.state.exitIntent)?(
                    <div>
                      <TextField value={this.state.exitIntentTime} onChange={this.timerChange('exitIntentTime')} label="Period for displaying Exit Intent" type="number" />
                    </div>
                  ):(null)}
                </div>
          ):(null)
            }
            <RadioButton label="Certain Period" helpText="Game will show in every certain period." id="period" name="period" onChange={this.handleFrequency} checked={this.state.frequency === 'period'} />
            { (this.state.frequency === "period")?(
                <div className="exit-intent">
                  <Checkbox checked={this.state.exitIntent} label="On Desktop - Only show when visitor are about to exit the page" onChange={this.handleExitIntent} />
                  {(this.state.exitIntent)?(
                    <div>
                      <TextField value={this.state.exitIntentTime} onChange={this.timerChange('exitIntentTime')} label="Period for displaying Exit Intent" type="number" />
                    </div>
                  ):(null)}
                </div>
          ):(null)
            }
          </Stack>
          { (this.state.showPeriod)?(
            <Stack horizontal>
              <TextField value={this.state.frequencyDay} onChange={this.timerChange('frequencyDay')} label="Days" type="number" />
              <TextField value={this.state.frequencyHour} onChange={this.timerChange('frequencyHour')} label="Hours" type="number" />
              <TextField value={this.state.frequencyMin} onChange={this.timerChange('frequencyMin')} label="Mins" type="number" />
            </Stack>
          ):(null)}
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
        <div className="page-footer">
          <Button onClick={() => this.saveSetting()} disabled={this.state.saveDisabled} primary>Save</Button>
        </div>
      </Page>
    );
  }

  handleDisplayChange = (checked, newValue) => {
    this.setState({ displaySetting: newValue, saveDisabled: false });
  }

  handleExitIntent = (value) => {
    this.setState({ exitIntent: value, saveDisabled: false });
  }

  timerChange = (field) => {
    return (value) => {
      if(value >= 0) this.setState({[field]: value, saveDisabled: false})
    }
  }

  handlePricingChange = async (checked, newValue) => {
    if(newValue == 'free') {
      await fetch(`https://app.trytada.com/free`)
      .then(response => response.json())
      .then(json => {
        if(json.success) {
          this.setState({ pricingPlan: 'free', saveDisabled: false});
        }
      });
    } else {
      await fetch(`https://app.trytada.com/premium`)
      .then(response => response.json())
      .then(json => {
        window.top.location.href = json.url;
      });
    }
  }

  handleFrequency = (checked, newValue) => {
    if(newValue == 'period') {
      this.setState({
        frequency: newValue,
        showPeriod: true,
	      saveDisabled: false
      });
    } else {
      this.setState({
        frequency: newValue,
        showPeriod: false,
	      saveDisabled: false
      });
    }
  }

  saveSetting = () => {
   var { pricingPlan, displaySetting, frequencyDay, frequencyHour, frequencyMin, timer, frequency, exitIntent, exitIntentTime } = this.state;
   var updateSetting = {};
   if(pricingPlan == "free") {
     updateSetting.pricingPlan = 0;
   } else {
     updateSetting.pricingPlan = 1;
   }
   updateSetting.displayFrequency = frequencyDay * 60 * 60 * 24 + frequencyHour * 60 * 60 + frequencyMin * 60;
   updateSetting.displaySetting = displaySetting;
   updateSetting.timer = timer;
   updateSetting.frequency = frequency;
   updateSetting.exitIntent = exitIntent;
   updateSetting.exitIntentTime = exitIntentTime;
   fetch(`https://app.trytada.com/saveSetting`, {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({
       updateSetting,
       shop: Cookies.get('shopOrigin')
    })
   }).then(resp => {
     this.setState({
	    saveDisabled: true
     });
   });
  }
}

export default Index;
