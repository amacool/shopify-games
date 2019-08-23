import { Page } from '@shopify/polaris'
import '../stylesheets/loading.css'

class Loading extends React.Component {
    componentDidMount = () => {
        setTimeout(function() {
            window.location.href = "/dashboard?hmac=true"
        }, 3000);
    }

    render() {
        return (
            <Page>
                <div id="loader-container">
                    <p id="loadingText">Loading</p>
                </div>
            </Page>
        )
    }
}

export default Loading;
