/******************************************************************************
**	@Author:				Thomas Bouder <Tbouder>
**	@Email:					Tbouder@protonmail.com
**	@Date:					Wednesday August 26th 2020
**	@Filename:				_app.js
******************************************************************************/

import	React							from	'react';
import	Head							from	'next/head';
import	{Toaster}						from	'react-hot-toast';
import	{Web3ReactProvider}				from	'@web3-react/core';
import	{ethers}						from	'ethers';
import	{Web3ContextApp}				from	'contexts/useWeb3';
import	Navbar							from	'components/Navbar';
import	{TMP_VAULTS}					from	'utils/API';

import	'style/Default.css';
import	'tailwindcss/tailwind.css';


function	AppWrapper(props) {
	const	{Component, pageProps, router} = props;

	return (
		<>
			<Head>
				<title>{'Pandaswap'}</title>
				<link rel={'icon'} href={'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🐼</text></svg>'} />
				<meta httpEquiv={'X-UA-Compatible'} content={'IE=edge'} />
				<meta name={'viewport'} content={'width=device-width, initial-scale=1'} />
				<meta name={'description'} content={'Pandaswap - Swap from one crv vault to an other'} />
				<meta name={'msapplication-TileColor'} content={'#9fcc2e'} />
				<meta name={'theme-color'} content={'#ffffff'} />
				<meta charSet={'utf-8'} />
			</Head>
			<div id={'app'} className={'flex w-full h-full relative min-h-screen main-gradient'}>
				<main className={'flex flex-col w-full h-full relative'}>
					<Navbar />
					<div className={'w-full h-full relative max-w-screen-lg mx-auto'}>
						<Component
							key={router.route}
							element={props.element}
							router={props.router}
							vaults={TMP_VAULTS} //should be fetched
							{...pageProps} />
					</div>
				</main>
			</div>
			<Toaster
				position={'top-right'}
				containerClassName={'-mt-2'}
				toastOptions={{className: 'text-sm border border-gray-200 max-h-24 overflow-scroll toast'}} />
		</>
	);
}

const getLibrary = (provider) => {
	return new ethers.providers.Web3Provider(provider, 'any');
};

function	MyApp(props) {
	const	{Component, pageProps} = props;
	
	return (
		<Web3ReactProvider getLibrary={getLibrary}>
			<Web3ContextApp>
				<AppWrapper
					Component={Component}
					pageProps={pageProps}
					element={props.element}
					router={props.router} />
			</Web3ContextApp>
		</Web3ReactProvider>
	);
}


export default MyApp;
