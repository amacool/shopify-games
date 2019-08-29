import { Select, Link, TextField, Checkbox, Button, RadioButton, Stack, Card } from '@shopify/polaris';
import store from 'store-js';
import Cookies from 'js-cookie';
import '../stylesheets/detailSetting.css';
import '../stylesheets/global.css';

class DetailSetting extends React.Component {
  state = { 
    displaySetting: '',
    displaySettingOptions: [
      {label: 'All Pages', value: 'all'},
      {label: 'All Product Pages', value: 'products'},
      {label: 'All Blog Pages', value: 'blogs'},
      {label: 'All Static Pages', value: 'pages'},
      // {label: 'Specifi Pages', value: 'specific'},
      {label: 'Specific Product/Collection', value: 'specificProduct'},
      {label: 'Specific Blog Posts', value: 'specificBlog'},
      {label: 'Specific Pages', value: 'specificPage'},
    ],
    displayFrequencyOptions:[
      {label: 'Every new visit of page', value: 'every'},
      {label: 'Once per user', value: 'once'},
      {label: 'Once every period of time', value: 'period'}
    ],
    timerTypeOptions: [
      {label: 'Bubble', value: 0},
      {label: 'Sticky Bar', value: 1}
    ],
    timerType: 0,
    timerPositionOptions: [
      [
        {label: 'Bottom Left', value: 0},
        {label: 'Bottom Right', value: 1},
        {label: 'Middle Left', value: 2},
        {label: 'Middle Right', value: 3},
        {label: 'Top Left', value: 4},
        {label: 'Top Right', value: 5},
      ],
      [
        {label: 'Bottom', value: 0},
        {label: 'Top', value: 1}
      ]
    ],
    timer: 0,
    frequencyDay: 0,
    frequencyHour: 0,
    frequencyMin: 0,
    showPeriod: false,
    frequency: '',
    saveDisabled: true,
    exitIntent: true,
    exitIntentTime: 5,
    deviceTypes: {
      desktop: true,
      tablet: true,
      mobile: true
    },
    headline: '',
    shortText: '',
    cta: '',
    exitButton: '',
    placeholder: '',
    resultHeadline: '',
    resultShortText: '',
    subscribe: '',
    couponExpiry: '',
    logo: '',
    timerHour: 0,
    timerMin: 0,
    expiryHour: 0,
    expiryMin: 0
  };

  componentDidMount = () => {
    fetch(`https://app.trytada.com/getSetting`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: Cookies.get('widget_id')
      })
    })
    .then(resp => resp.json())
    .then(json => {
      if(json.error) {
        return;
      }
      if(json) {
        var result = json.setting;
        var frequencyDay = Math.floor(result.displayFrequency/(24*60*60*1000));
        var frequencyHour = Math.floor((result.displayFrequency - frequencyDay * (24* 60 * 60 * 1000))/(60*60*1000));
        var frequencyMin = Math.floor((result.displayFrequency - frequencyDay * (24*60*60) - frequencyHour * (60 * 60 * 1000))/(60 * 1000));
        var showPeriod = false;
        if(result.frequency == 'period') {
          showPeriod = true;
        }

        this.setState({
          displaySetting: result.displaySetting,
          frequencyDay,
          frequencyHour,
          frequencyMin,
          timer: result.timer,
          frequency: result.frequency,
          showPeriod,
          exitIntent: result.exitIntent,
          exitIntentTime: result.exitIntentTime
        });
      }
    });
  }

  render() {
    const { displaySetting, displaySettingOptions, frequency, frequencyDay, frequencyHour, frequencyMin, displayFrequencyOptions, timerPositionOptions, timerPosition, timerType, timerTypeOptions, deviceTypes, timerHour, timerMin, headline, shortText, resultShortText, resultHeadline, cta, couponExpiry, exitButton, placeholder, subscribe, expiryHour, expiryMin, exitIntent} = this.state;
    return (
      <div>
        <div className="discount-setting">
            <Card>
                <div className="header3">Widget Settings</div>
                <div className="detail-display">
                  <Select
                    label="Where does this Widget show?"
                    options={displaySettingOptions}
                    onChange={this.handleDisplayChange}
                    value={displaySetting}
                    />
                  { (this.state.displaySetting == 'specific')?(
                    <div className="subsetting">
                      <Link url="/selectPages">Select Specific Pages</Link>
                    </div>
                  ):(null) }
                </div>
                <div className="detail-when">
                  <Select
                    label="When does this Widget show?"
                    options={displayFrequencyOptions}
                    onChange={this.handleFrequency}
                    value={frequency}
                    />
                  { (frequency == 'period')?(
                    <Stack horizontal>
                      <TextField value={frequencyDay} min="0" onChange={this.timerChange('frequencyDay')} label="Days" type="number" />
                      <TextField value={frequencyHour} min="0" max="59" onChange={this.timerChange('frequencyHour')} label="Hours" type="number" />
                      <TextField value={frequencyMin} min="0" max="59" onChange={this.timerChange('frequencyMin')} label="Mins" type="number" />
                    </Stack>
                  ):(null)}
                </div>
            </Card>
        </div>
        <div className="discount-add">
            <Card>
                <div className="header3">Countdown Timer Reminder</div>
                {(this.state.timerEnable)?(<div className="reminder-enable">
                  <Button onClick={() => this.handleTimerEnable(true)} primary>Enable</Button>
                  <Button onClick={() => this.handleTimerEnable(false)}>Disable</Button>
                </div>):(
                <div className="reminder-enable">
                  <Button onClick={() => this.handleTimerEnable(true)}>Enable</Button>
                  <Button onClick={() => this.handleTimerEnable(false)} primary>Disable</Button>
                </div>)}
                <div className="timer-type">
                  <Select
                    options={timerTypeOptions}
                    onChange={this.handleTimerType}
                    value={timerType}
                    />
                </div>
                <div className="timer-position">
                  <Select
                    options={timerPositionOptions[timerType]}
                    onChange={this.handleTimerPosition}
                    value={timerPosition}
                    />
                </div>
            </Card>
        </div>
        <div className="coupon-chance">
            <Card>
                <div>
                    <div className="header3">Advanced Settings</div>
                    {
                        (!this.state.isShowAdvance)?(
                            <div className="view-chances" onClick={this.showAdvance}>View Settings</div>
                        ):(
                            <div className="view-chances" onClick={this.showAdvance}>Close</div>
                        )
                    }
                </div>
                {
                    (this.state.isShowAdvance)?(
                      <div>
                        <div className="device-filter">
                          <p>Where to display the game?</p>
                          <Checkbox checked={deviceTypes.desktop} onChange={this.handleDeviceType('desktop')} label="Desktop" />
                          <Checkbox checked={deviceTypes.tablet} onChange={this.handleDeviceType('tablet')} label="Tablet" />
                          <Checkbox checked={deviceTypes.mobile} onChange={this.handleDeviceType('mobile')} label="Mobile" />
                        </div>
                        <div className="widget-text">
                          <TextField label="HeadLine" value={headline} onChange={this.handleInput('headline')} />
                          <TextField label="Short Text" value={shortText} onChange={this.handleInput('shortText')} />
                          <Select label="Delay before showing Widget"
                            options={[
                              {label: 'Yes', value: true},
                              {label: 'No', value: false}
                            ]}
                            onChange={this.handleTimer}
                            />
                          <p>Time Entry</p>
                          <div>
                            <TextField label="" value={timerHour} onChange={this.handleInput('timerHour')} />
                            <span>hours</span>
                            <TextField lable="" value={timerMin} onChange={this.handleInput('timerMin')} />
                            <span>minutes</span>
                          </div>
                          <TextField label="CTA" value={CTA} onChange={this.handleInput('cta')} />
                          <TextField label="Exit Button" value={exitButton} onChange={this.handleInput('exitButton')} />
                          <TextField label="Email" value={placeholder} onChange={this.handleInput('placeholder')} />
                        </div>
                        <div className="widget-result">
                          <p>Result Screen</p>
                          <TextField label="Headline" value={resultHeadline}  onChange={this.handleInput('resultHeadline')} />
                          <TextField label="Short Text" value={resultShortText}  onChange={this.handleInput('resultShortText')} />
                        </div>
                        <div className="widget-other">
                          <p>Automatically add your subscriber to your shopify customer list?</p>
                          {(subscribe)?(<div className="subscribe-btn-group">
                            <Button onClick={() => this.handleSubscribe(true)} primary>Enable</Button>
                            <Button onClick={() => this.handleSubscribe(false)}>Disable</Button>
                          </div>):(
                          <div className="subscribe-btn-group">
                            <Button onClick={() => this.handleSubscribe(true)}>Enable</Button>
                            <Button onClick={() => this.handleSubscribe(false)} primary>Disable</Button>
                          </div>)}
                          <p>Coupon expiry</p>
                          <div>
                            <TextField label="" value={expiryHour} onChange={this.handleInput('expiryHour')} />
                            <span>hours</span>
                            <TextField lable="" value={expiryMin} onChange={this.handleInput('expiryMin')} />
                            <span>minutes</span>
                          </div>
                          <p>Exit intent</p>
                          {(exitIntent)?(<div className="exit-btn-group">
                            <Button onClick={() => this.handleExit(true)} primary>Enable</Button>
                            <Button onClick={() => this.handleExit(false)}>Disable</Button>
                          </div>):(
                          <div className="exit-btn-group">
                            <Button onClick={() => this.handleExit(true)}>Enable</Button>
                            <Button onClick={() => this.handleExit(false)} primary>Disable</Button>
                          </div>)}
                          <p>How often should the Exit Intent show?</p>
                          <div>
                            <TextField label="" value={exitIntentTime} onChange={this.handleInput('exitIntentTime')} />
                            <span>hours</span>
                          </div>
                        </div>
                        <div className="widget-logo">
                          <p>Logo (optional)</p>
                          <div className="widget-logo-upload">
                            <input type="file" name="logo" />
                            <a href="#">Add Image</a>
                            <div>or drop files to upload</div>
                          </div>
                        </div>
                      </div>
                    ): (null)
                }
                
            </Card>
        </div>
        <div className="coupon-bottom">
            <div className="coupon-prev-btn-wrapper">
                <Button onClick={() => this.saveSetting('style')}>Previous Step</Button>
            </div>
            <div className="coupon-next-btn-wrapper">
                <Button primary onClick={() => this.saveSetting('final')}>Finish</Button>
            </div>
        </div>
      </div>
    );
  }

  handleTimerPosition = (value) => {
    this.setState({
      timerPostion: value
    })
  }

  handleTimerType = (value) => {
    this.setState({
      timerType: value,
      timerPosition: this.state.timerPositionOptions[value].value
    })
  }

  showAdvance = () => {
    this.setState({
      isShowAdvance: !this.state.isShowAdvance
    })
  }

  handleTimerEnable = (flag) => {
    this.setState({
      timerEnable: flag
    })
  }

  handleDisplayChange = (field) => {
    this.setState({
      displaySetting: field
    });
  }

  handleExitIntent = (value) => {
    this.setState({ exitIntent: value, saveDisabled: false });
  }

  timerChange = (field) => {
    return (value) => {
      if(value >= 0) this.setState({[field]: value, saveDisabled: false})
    }
  }

  handleFrequency = (newValue) => {
    this.setState({
      frequency: newValue,
    });
  }

  saveSetting = (next) => {
   var { displaySetting, frequencyDay, frequencyHour, frequencyMin, timer, frequency, exitIntent, exitIntentTime } = this.state;
   var updateSetting = {};
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
       id: Cookies.get('widget_id')
    })
   }).then(resp => {
     this.setState({
	    saveDisabled: true
     });
     this.props.next(next);
   });
  }
}

export default DetailSetting;
