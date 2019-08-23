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
                <div className="page-wrapper">
                    <div id="loader-container">
                        <p id="loadingText">Loading</p>
                    </div>
                </div>
            </Page>
        )
    }
}

export default Loading;
