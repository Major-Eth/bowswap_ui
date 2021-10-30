import	React, {useState, useEffect, useCallback}		from	'react';
import	{ethers}										from	'ethers';
import	useWeb3											from	'contexts/useWeb3';
import	useAccount										from	'contexts/useAccount';
import	useLocalStorage									from	'hook/useLocalStorage';
import	useDebounce										from	'hook/useDebounce';
import	{approveToken, metapoolSwapTokens, swapTokens, metapoolSwapTokensWithSignature, swapTokensWithSignature, signTransaction}	from	'utils/actions';
import	InputToken										from	'components/Bowswap/InputToken';
import	InputTokenDisabled								from	'components/Bowswap/InputTokenDisabled';
import	ModalVaultList									from	'components/Bowswap/ModalVaultList';
import	BlockStatus										from	'components/Bowswap/BlockStatus';
import	Success											from	'components/Icons/Success';
import	Error											from	'components/Icons/Error';
import	Pending											from	'components/Icons/Pending';
import	BOWSWAP_CRV_EUR_VAULTS							from	'utils/BOWSWAP_CRV_EUR_VAULTS';
import	BOWSWAP_CRV_BTC_VAULTS							from	'utils/BOWSWAP_CRV_BTC_VAULTS';
import	BOWSWAP_CRV_USD_VAULTS							from	'utils/BOWSWAP_CRV_USD_VAULTS';
import	BOWSWAP_CRV_V2_VAULTS							from	'utils/BOWSWAP_CRV_V2_VAULTS';
import	V2_PATHS										from	'utils/currentPaths';
import	{bigNumber, toAddress}							from	'utils';

function	SectionFromVault({vaults, fromVault, set_fromVault, fromAmount, set_fromAmount, slippage, set_slippage, fromCounterValue, balanceOf, disabled, yearnVaultData}) {
	const	[isInit, set_isInit] = useState(false);

	function	updateInputValue(newValue) {
		let		_value = newValue.replaceAll('..', '.').replaceAll(/[^0-9.]/g, '');
		const	[dec, frac] = _value.split('.');
		if (frac) _value = `${dec}.${frac.slice(0, 12)}`;

		if (_value === '.') {
			set_fromAmount('0.');
		} else if (_value.length > 0 && _value[0] === '-') {
			set_fromAmount('');
		} else if (_value.length >= 2 && _value[0] === '0' && _value[1] !== '.') {
			set_fromAmount(_value.slice(1) || '');
		} else {
			set_fromAmount(_value || '');
		}
	}

	useEffect(() => {
		if (!isInit && (fromAmount !== '' && fromAmount !== '0.0' && Number(fromAmount) !== 0)) {
			updateInputValue(fromAmount);
			set_isInit(true);
		}
		else if (!isInit && balanceOf !== '0') {
			set_fromAmount(ethers.utils.formatUnits(balanceOf, fromVault.decimals));
			set_isInit(true);
		}
	}, [isInit, balanceOf, fromAmount]);

	return (
		<section aria-label={'FROM_VAULT'}>
			<label className={'font-medium text-ybase text-ygray-900 pl-0.5'}>{'From Vault'}</label>
			<div className={'flex flex-col md:flex-row items-start justify-center space-y-2 md:space-y-0 md:space-x-4 w-full'}>
				<div className={'w-full md:w-4/11'}>
					<ModalVaultList
						isFrom
						label={'Select from vault'}
						disabled={disabled}
						vaults={vaults}
						yearnVaultData={yearnVaultData}
						value={fromVault}
						set_value={set_fromVault}
						set_input={(v) => {
							updateInputValue(ethers.utils.formatUnits(v, fromVault.decimals));
						}} />
				</div>
				<div className={'w-full md:w-7/11'}>
					<InputToken
						disabled={disabled}
						balanceOf={balanceOf}
						decimals={fromVault.decimals}
						fromCounterValue={fromCounterValue}
						value={fromAmount}
						set_value={set_fromAmount}
						slippage={slippage}
						set_slippage={set_slippage} />
				</div>
			</div>
		</section>
	);
}

function	SectionToVault({vaults, toVault, set_toVault, expectedReceiveAmount, toCounterValue, balanceOf, slippage, isFetchingExpectedReceiveAmount, disabled, yearnVaultData}) {
	return (
		<section aria-label={'TO_VAULT'}>
			<label className={'font-medium text-ybase text-ygray-900 pl-0.5'}>{'To Vault'}</label>
			<div className={'flex flex-col md:flex-row items-start justify-center space-y-2 md:space-y-0 md:space-x-4 w-full'}>
				<div className={'w-full md:w-4/11'}>
					<ModalVaultList
						label={'Select to vault'}
						disabled={disabled}
						vaults={vaults}
						yearnVaultData={yearnVaultData}
						value={toVault}
						set_value={set_toVault}
						set_input={() => null} />
				</div>
				<div className={'w-full md:w-7/11'}>
					<InputTokenDisabled
						value={expectedReceiveAmount}
						toCounterValue={toCounterValue}
						slippage={slippage}
						balanceOf={balanceOf}
						decimals={toVault.decimals}
						isFetchingExpectedReceiveAmount={isFetchingExpectedReceiveAmount} />
				</div>
			</div>
		</section>
	);
}

function	ButtonSwap({fromVault, toVault, fromAmount, expectedReceiveAmount, slippage, signature, shouldIncreaseGasLimit, approved, disabled, onCallback}) {
	const	{provider} = useWeb3();
	const	[transactionProcessing, set_transactionProcessing] = useState(false);

	const	[DEBUG_TX, set_DEBUG_TX] = useState(-1);

	useEffect(() => {
		window.swap = () => set_DEBUG_TX(n => n + 1);
	}, [typeof(window) !== 'undefined']);

	useEffect(() => {
		if (DEBUG_TX >= 0)
			performSwap(true);
	}, [DEBUG_TX]);

	function	performV2Swap() {
		try {
			swapTokens({
				provider: provider,
				contractAddress: process.env.METAPOOL_SWAPPER_ADDRESS,
				from: fromVault.address,
				to: toVault.address,
				amount: ethers.utils.parseUnits(fromAmount, fromVault.decimals),
				minAmountOut: ethers.utils.parseUnits((expectedReceiveAmount - (expectedReceiveAmount * slippage / 100)).toString(), fromVault.decimals),
				instructions: V2_PATHS.find(path => path[0] === fromVault.address && path[1] === toVault.address)?.[2],
				shouldIncreaseGasLimit
			}, ({error}) => {
				if (error) {
					let message = undefined;
					if (error?.data?.message?.includes('revert out too low')) {
						message = 'SLIPPAGE TOO HIGH. TO PROCEED, PLEASE INCREASE THE SLIPPAGE TOLERANCE';
					}
					set_transactionProcessing(false);
					return onCallback('error', message);
				}
				set_transactionProcessing(false);
				onCallback('success');
			});
		} catch (error) {
			let message = undefined;
			if (error?.data?.message?.includes('revert out too low')) {
				message = 'SLIPPAGE TOO HIGH. TO PROCEED, PLEASE INCREASE THE SLIPPAGE TOLERANCE';
			}
			set_transactionProcessing(false);
			return onCallback('error', message);
		}
	}
	function	performV1Swap() {
		const	v2PathExists = V2_PATHS.find(path => path[0] === fromVault.address && path[1] === toVault.address);

		try {
			metapoolSwapTokens({
				provider: provider,
				contractAddress: process.env.METAPOOL_SWAPPER_ADDRESS,
				from: fromVault.address,
				to: toVault.address,
				amount: ethers.utils.parseUnits(fromAmount, fromVault.decimals),
				minAmountOut: ethers.utils.parseUnits((expectedReceiveAmount - (expectedReceiveAmount * slippage / 100)).toString(), fromVault.decimals),
				shouldIncreaseGasLimit
			}, ({error}) => {
				if (error) {
					if (error?.message?.includes('User denied transaction signature')) {
						set_transactionProcessing(false);
						return onCallback('error', 'User denied transaction signature');
					} else if (v2PathExists) {
						console.log('FALLBACK_WITH_V2');
						return performV2Swap();
					} else {
						let message = undefined;
						if (error?.data?.message?.includes('revert out too low')) {
							message = 'SLIPPAGE TOO HIGH. TO PROCEED, PLEASE INCREASE THE SLIPPAGE TOLERANCE';
						}
						set_transactionProcessing(false);
						return onCallback('error', message);
					}
				}
				set_transactionProcessing(false);
				onCallback('success');
			});
		} catch (error) {
			if (error?.message?.includes('User denied transaction signature')) {
				set_transactionProcessing(false);
				return onCallback('error', 'User denied transaction signature');
			} else if (v2PathExists) {
				console.log('FALLBACK_WITH_V2');
				return performV2Swap();
			} else {
				let message = undefined;
				if (error?.data?.message?.includes('revert out too low')) {
					message = 'SLIPPAGE TOO HIGH. TO PROCEED, PLEASE INCREASE THE SLIPPAGE TOLERANCE';
				}
				set_transactionProcessing(false);
				return onCallback('error', message);
			}
		}
	}

	function	performV2SwapWithSignature() {
		swapTokensWithSignature({
			provider: provider,
			contractAddress: process.env.SIGNATURE_METAPOOL_SWAPPER_ADDRESS,
			from: fromVault.address,
			to: toVault.address,
			amount: ethers.utils.parseUnits(fromAmount, fromVault.decimals),
			minAmountOut: ethers.utils.parseUnits((expectedReceiveAmount - (expectedReceiveAmount * slippage / 100)).toString(), fromVault.decimals),
			instructions: V2_PATHS.find(path => path[0] === fromVault.address && path[1] === toVault.address)?.[2],
			signature,
			shouldIncreaseGasLimit
		}, ({error}) => {
			if (error) {
				if (error?.message?.includes('User denied transaction signature')) {
					set_transactionProcessing(false);
					return onCallback('error', 'User denied transaction signature');
				} else {
					let message = undefined;
					if (error?.data?.message?.includes('revert out too low')) {
						message = 'SLIPPAGE TOO HIGH. TO PROCEED, PLEASE INCREASE THE SLIPPAGE TOLERANCE';
					} else if (error?.data?.message?.includes('execution reverted')) {
						message = 'INVALID SIGNATURE, FALLBACK TO DEFAULT FLOW';
					} else {
						message = 'INVALID SIGNATURE, FALLBACK TO DEFAULT FLOW';
					}
					set_transactionProcessing(false);
					return onCallback('error', message);
				}
			}
			set_transactionProcessing(false);
			onCallback('success');
		});
	}
	function	performV1SwapWithSignature() {
		const	v2PathExists = V2_PATHS.find(path => path[0] === fromVault.address && path[1] === toVault.address);

		try {
			metapoolSwapTokensWithSignature({
				provider: provider,
				contractAddress: process.env.SIGNATURE_METAPOOL_SWAPPER_ADDRESS,
				from: fromVault.address,
				to: toVault.address,
				amount: ethers.utils.parseUnits(fromAmount, fromVault.decimals),
				minAmountOut: ethers.utils.parseUnits((expectedReceiveAmount - (expectedReceiveAmount * slippage / 100)).toString(), fromVault.decimals),
				signature,
				shouldIncreaseGasLimit
			}, ({error}) => {
				if (error) {
					if (error?.message?.includes('User denied transaction signature')) {
						set_transactionProcessing(false);
						return onCallback('error', 'User denied transaction signature');
					} else if (v2PathExists) {
						console.log('FALLBACK_WITH_V2');
						return performV2SwapWithSignature();
					} else {
						let message = undefined;
						if (error?.data?.message?.includes('revert out too low')) {
							message = 'SLIPPAGE TOO HIGH. TO PROCEED, PLEASE INCREASE THE SLIPPAGE TOLERANCE';
						} else if (error?.message?.includes('execution reverted')) {
							message = 'INVALID SIGNATURE, FALLBACK TO DEFAULT FLOW';
						} else {
							message = 'INVALID SIGNATURE, FALLBACK TO DEFAULT FLOW';
						}
						set_transactionProcessing(false);
						return onCallback('error', message);
					}
				}
				set_transactionProcessing(false);
				onCallback('success');
			});
		} catch (error) {
			if (error?.message?.includes('User denied transaction signature')) {
				set_transactionProcessing(false);
				return onCallback('error', 'User denied transaction signature');
			} else if (v2PathExists) {
				console.log('FALLBACK_WITH_V2');
				return performV2Swap();
			} else {
				let message = undefined;
				if (error?.message?.includes('revert out too low')) {
					message = 'SLIPPAGE TOO HIGH. TO PROCEED, PLEASE INCREASE THE SLIPPAGE TOLERANCE';
				}
				set_transactionProcessing(false);
				return onCallback('error', message);
			}
		}
	}

	function	performSwap(forced = false) {
		if (!forced && (disabled || transactionProcessing || !approved)) {
			return;
		}
		set_transactionProcessing(true);
		onCallback('pending');
		if (toVault.scope === 'v2') {
			if (signature) {
				return performV2SwapWithSignature();
			}
			performV2Swap();
		} else {
			if (signature) {
				return performV1SwapWithSignature();
			}
			performV1Swap();
		}
	}

	return (
		<button
			onClick={() => performSwap(false)}
			className={`w-full h-11 flex items-center justify-center space-x-2 px-6 py-3 text-ybase font-medium rounded-lg focus:outline-none overflow-hidden transition-colors border ${
				disabled || transactionProcessing || !approved ? 'text-ygray-400 bg-white border-ygray-400 cursor-not-allowed' :
					'bg-yblue hover:bg-yblue-hover border-yblue hover:border-yblue-hover text-white cursor-pointer'
			}`}>
			<span>{'Swap'}</span>
		</button>
	);
}

function	ButtonApprove({fromVault, fromAmount, approved, disabled, set_signature, canSign, onCallback}) {
	const	{provider} = useWeb3();
	const	[transactionProcessing, set_transactionProcessing] = useState(false);
	const	[DEBUG_TX, set_DEBUG_TX] = useState(-1);

	useEffect(() => {
		window.approve = (nonce) => set_DEBUG_TX(nonce);
	}, [typeof(window) !== 'undefined']);

	useEffect(() => {
		if (DEBUG_TX >= 0)
			performApprove(true, DEBUG_TX);
	}, [DEBUG_TX]);

	function	approveTx() {
		try {
			approveToken({
				provider: provider,
				contractAddress: fromVault.address,
				amount: ethers.utils.parseUnits(fromAmount, fromVault.decimals),
				from: process.env.METAPOOL_SWAPPER_ADDRESS
			}, ({error}) => {
				if (error) {
					set_transactionProcessing(false);
					return onCallback('error');
				}
				set_transactionProcessing(false);
				onCallback('success');
			});	
		} catch (error) {
			set_transactionProcessing(false);
			onCallback('error');
		}
	}

	function	performApprove(forced = false, nonceOverwrite = undefined) {
		if (!forced && (disabled || transactionProcessing || (!fromAmount || Number(fromAmount) === 0))) {
			return;
		}
		set_transactionProcessing(true);
		onCallback('pending');
		if (!canSign) {
			return approveTx();
		}
		try {
			signTransaction({
				provider: provider,
				vaultAddress: fromVault.address,
				contractAddress: process.env.SIGNATURE_METAPOOL_SWAPPER_ADDRESS,
				amount: ethers.utils.parseUnits(fromAmount, fromVault.decimals),
				nonceOverwrite 
			}, ({error, data}) => {
				if (error) {
					if (error?.message?.includes('User denied message signature')) {
						set_transactionProcessing(false);
						return onCallback('error', 'User denied signature');
					}
					console.log('FALLBACK_WITH_APPROVE');
					return approveTx();
				}
				set_signature(data);
				set_transactionProcessing(false);
				onCallback('success');
			});
		} catch (error) {
			if (error?.message?.includes('User denied message signature')) {
				set_transactionProcessing(false);
				return onCallback('error', 'User denied signature');
			}
			console.log('FALLBACK_WITH_APPROVE');
			return approveTx();
		}
	}

	if (approved) {
		return (
			<button
				className={'w-full h-11 flex items-center justify-center space-x-2 px-6 py-3 text-ybase font-medium rounded-lg focus:outline-none overflow-hidden transition-colors border bg-white border-yblue text-yblue cursor-not-allowed'}>
				<div className={'flex flex-row items-center justify-center'}>
					<span>{'Approved'}</span>
					<svg className={'ml-2'} width={'16'} height={'16'} viewBox={'0 0 16 16'} fill={'none'} xmlns={'http://www.w3.org/2000/svg'}>
						<path fillRule={'evenodd'} clipRule={'evenodd'} d={'M13.7602 3.48787C14.043 3.72358 14.0813 4.14396 13.8456 4.42681L7.17889 12.4268C6.96078 12.6885 6.58042 12.7437 6.29694 12.5547L2.29694 9.88805C1.99058 9.68382 1.9078 9.2699 2.11204 8.96355C2.31627 8.6572 2.73019 8.57442 3.03654 8.77865L6.53809 11.113L12.8213 3.57323C13.057 3.29038 13.4773 3.25216 13.7602 3.48787Z'} fill={'#00A3FF'}/>
					</svg>
				</div>
			</button>
		);
	}

	return (
		<button
			onClick={performApprove}
			className={`w-full h-11 flex items-center justify-center space-x-2 px-6 py-3 text-ybase font-medium rounded-lg focus:outline-none overflow-hidden transition-colors border ${
				disabled || transactionProcessing || (!fromAmount || Number(fromAmount) === 0) ? 'text-ygray-400 bg-white border-ygray-400 cursor-not-allowed' :
					'bg-yblue border-yblue hover:bg-yblue-hover hover:border-yblue-hover text-white cursor-pointer'
			}`}>
			<span>{'Approve'}</span>
		</button>
	);
}

function	Bowswap({prices}) {
	const	{provider} = useWeb3();
	const	{balancesOf, updateBalanceOf, allowances, yearnVaultData} = useAccount();
	const	[, set_nonce] = useState(0);
	const	[fromVault, set_fromVault] = useLocalStorage('fromVault', BOWSWAP_CRV_USD_VAULTS[0]);
	const	[fromCounterValue, set_fromCounterValue] = useLocalStorage('fromCounterValue', 0);
	const	[fromAmount, set_fromAmount] = useLocalStorage('fromAmount', '');
	const	[balanceOfFromVault, set_balanceOfFromVault] = useState(0);
	const	[toVaultsListV2, set_toVaultsListV2] = useState(V2_PATHS.filter(e => e[0] === BOWSWAP_CRV_USD_VAULTS[0]));
	const	[toVaultsList, set_toVaultsList] = useState(BOWSWAP_CRV_USD_VAULTS.slice(1));
	const	[toVault, set_toVault] = useLocalStorage('toVault', BOWSWAP_CRV_USD_VAULTS[1]);
	const	[toCounterValue, set_toCounterValue] = useState(0);
	const	[expectedReceiveAmount, set_expectedReceiveAmount] = useState('');
	const	[slippage, set_slippage] = useState(0.05);
	const	[isFetchingExpectedReceiveAmount, set_isFetchingExpectedReceiveAmount] = useState(false);
	const	debouncedFetchExpectedAmount = useDebounce(fromAmount, 750);
	const	[txApproveStatus, set_txApproveStatus] = useState({none: true, pending: false, success: false, error: false});
	const	[txSwapStatus, set_txSwapStatus] = useState({none: true, pending: false, success: false, error: false});
	const	[signature, set_signature] = useState(null);
	const	[canSign, set_canSign] = useState(true);

	function	resetStates() {
		set_signature(null);
		set_fromAmount('');
		set_toCounterValue(0);
		set_expectedReceiveAmount('');
		set_slippage(0.10);
		set_txApproveStatus({none: true, pending: false, success: false, error: false});
		set_txSwapStatus({none: true, pending: false, success: false, error: false});
	}

	async function computeTriCryptoPrice() {
		const	LP_TOKEN = '0xcA3d75aC011BF5aD07a98d02f18225F9bD9A6BDF';
		const	magicAddress = '0x83d95e0D5f402511dB06817Aff3f9eA88224B030';
		const	magicContract = new ethers.Contract(magicAddress, ['function getNormalizedValueUsdc(address, uint256) public view returns (uint256)'], provider);
		const	priceUSDC = await magicContract.getNormalizedValueUsdc(LP_TOKEN, '1000000000000000000');
		return	ethers.utils.formatUnits(priceUSDC, 6);
	}

	const	fetchEstimateOut = useCallback(async (from, to, amount) => {
		const	fromToken = new ethers.Contract(process.env.METAPOOL_SWAPPER_ADDRESS, [
			'function metapool_estimate_out(address from, address to, uint256 amount) public view returns (uint256)',
			'function estimate_out(address from, address to, uint256 amount, tuple(bool deposit, address pool, uint128 n)[] instructions) public view returns (uint256)'
		], provider);

		if (toVault.scope === 'v2') {
			if (V2_PATHS.find(path => path[0] === fromVault.address && path[1] === toVault.address) !== undefined) {
				const	estimate_out = await fromToken.estimate_out(
					from,
					to,
					amount,
					V2_PATHS.find(path => path[0] === fromVault.address && path[1] === toVault.address)?.[2]
				);
				set_expectedReceiveAmount(ethers.utils.formatUnits(estimate_out, toVault.decimals));
				set_isFetchingExpectedReceiveAmount(false);
			}
		} else {
			const	metapool_estimate_out = await fromToken.metapool_estimate_out(from, to, amount);
			set_expectedReceiveAmount(ethers.utils.formatUnits(metapool_estimate_out, toVault.decimals));
			set_isFetchingExpectedReceiveAmount(false);
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fromVault.address, provider, toVault?.address, toVault?.decimals, toVault?.scope, toVault?.type]);

	/**************************************************************************
	**	This function will be used to compute the counter value of the want
	**	token of the `FROM` vault.
	**	To compute the price of the token, we will need the virtualPrice, aka
	**	the ~ price of the tokens in the curve pool and the pricePerShare, to
	**	know how many tokens we are working with.
	**	We will also need the price of the underlying token to adapt the price
	**	to USD.
	**
	**	@TRIGGER : any time the `FROM` vault changes
	**************************************************************************/
	async function fetchFromVaultVirtualPrice() {
		const	poolContract = new ethers.Contract(fromVault.poolAddress, ['function get_virtual_price() public view returns (uint256)'], provider);
		const	vaultContract = new ethers.Contract(fromVault.address, [
			'function pricePerShare() public view returns (uint256)',
			'function balanceOf(address) public view returns (uint256)'
		], provider);
		const	underlyingContract = new ethers.Contract(fromVault.tokenAddress, [
			'function balanceOf(address) public view returns (uint256)'
		], provider);
		const	virtualPrice = await poolContract.get_virtual_price();
		const	pricePerShare = await vaultContract.pricePerShare();
		const	balanceOfVault = await underlyingContract.balanceOf(fromVault.address);
		const	scaledBalanceOf = bigNumber.from(ethers.constants.WeiPerEther).mul(pricePerShare).div(bigNumber.from(10).pow(18)).mul(virtualPrice).div(bigNumber.from(10).pow(18));

		if (fromVault.scope === 'btc' || (fromVault.scope === 'v2' && fromVault.type === 'btc')) {
			set_fromCounterValue(prices.bitcoin.usd * ethers.utils.formatUnits(scaledBalanceOf, 18));
		} else if (fromVault.scope === 'eur' || (fromVault.scope === 'v2' && fromVault.type === 'eur')) {
			set_fromCounterValue((prices?.['tether-eurt'].usd || 1) * ethers.utils.formatUnits(scaledBalanceOf, 18));
		} else if (fromVault.scope === 'v2' && fromVault.type === 'eth') {
			set_fromCounterValue(prices.ethereum.usd * ethers.utils.formatUnits(scaledBalanceOf, 18));
		} else if (fromVault.scope === 'v2' && fromVault.type === 'aave') {
			set_fromCounterValue(prices.aave.usd * ethers.utils.formatUnits(scaledBalanceOf, 18));
		} else if (fromVault.scope === 'v2' && fromVault.type === 'link') {
			set_fromCounterValue(prices.chainlink.usd * ethers.utils.formatUnits(scaledBalanceOf, 18));
		} else if (fromVault.scope === 'v2' && fromVault.type === 'tri') {
			const	price = await computeTriCryptoPrice();
			set_fromCounterValue(price * ethers.utils.formatUnits(scaledBalanceOf, 18));
		} else {
			set_fromCounterValue(ethers.utils.formatUnits(scaledBalanceOf, 18));
		}
		set_balanceOfFromVault(ethers.utils.formatUnits(balanceOfVault, fromVault.decimals));
	}

	/**************************************************************************
	**	This function will be used to compute the counter value of the want
	**	token of the `TO` vault.
	**	To compute the price of the token, we will need the virtualPrice, aka
	**	the ~ price of the tokens in the curve pool and the pricePerShare, to
	**	know how many tokens we are working with.
	**	We will also need the price of the underlying token to adapt the price
	**	to USD.
	**
	**	@TRIGGER : any time the `TO` vault changes
	**************************************************************************/
	async function fetchToVaultVirtualPrice() {
		const	poolContract = new ethers.Contract(toVault.poolAddress, ['function get_virtual_price() public view returns (uint256)'], provider);
		const	vaultContract = new ethers.Contract(toVault.address, ['function pricePerShare() public view returns (uint256)'], provider);
		const	virtualPrice = await poolContract.get_virtual_price();
		const	pricePerShare = await vaultContract.pricePerShare();
		const	scaledBalanceOf = bigNumber.from(ethers.constants.WeiPerEther).mul(pricePerShare).div(bigNumber.from(10).pow(18)).mul(virtualPrice).div(bigNumber.from(10).pow(18));

		if (toVault.scope === 'btc' || (toVault.scope === 'v2' && toVault.type === 'btc')) {
			set_toCounterValue(prices.bitcoin.usd * ethers.utils.formatUnits(scaledBalanceOf, 18));
		} else if (toVault.scope === 'eur' || (toVault.scope === 'v2' && toVault.type === 'eur')) {
			set_toCounterValue((prices?.['tether-eurt'].usd || 1) * ethers.utils.formatUnits(scaledBalanceOf, 18));
		} else if (toVault.scope === 'v2' && toVault.type === 'eth') {
			set_toCounterValue(prices.ethereum.usd * ethers.utils.formatUnits(scaledBalanceOf, 18));
		} else if (toVault.scope === 'v2' && toVault.type === 'aave') {
			set_toCounterValue(prices.aave.usd * ethers.utils.formatUnits(scaledBalanceOf, 18));
		} else if (toVault.scope === 'v2' && toVault.type === 'link') {
			set_toCounterValue(prices.chainlink.usd * ethers.utils.formatUnits(scaledBalanceOf, 18));
		} else if (toVault.scope === 'v2' && toVault.type === 'tri') {
			const	price = await computeTriCryptoPrice();
			set_toCounterValue(price * ethers.utils.formatUnits(scaledBalanceOf, 18));
		} else {
			set_toCounterValue(ethers.utils.formatUnits(scaledBalanceOf, 18));
		}
	}

	/**************************************************************************
	**	Any time the fromVault address is changed, we need to change the list
	**	of addresses that can be used as `TO` vaults. With BowswapV2 there is
	**	two available list, the Legacy (aka metapool, aka btc <> btc or
	**	usd <> usd), and the V2, allowing swap between pools.
	**
	**	@TRIGGER : any time the `FROM` vault changes
	**************************************************************************/
	useEffect(() => {
		const	V2Paths = V2_PATHS.filter(e => toAddress(e[0]) === toAddress(fromVault.address)).map(e => e[1]);
		const	V2VaultList = BOWSWAP_CRV_V2_VAULTS.filter(e => V2Paths.includes(toAddress(e.address)));
		set_toVaultsListV2(V2VaultList);

		if (fromVault.scope === 'btc') {
			const	vaultList = BOWSWAP_CRV_BTC_VAULTS.filter(e => e.address !== fromVault.address);
			set_toVaultsList(vaultList);
			if (toVault.scope !== 'btc' || fromVault.address === toVault.address || !V2Paths.includes(toAddress(toVault.address)))
				set_toVault(vaultList[0]);
		} else if (fromVault.scope === 'usd') {
			const	vaultList = BOWSWAP_CRV_USD_VAULTS.filter(e => e.address !== fromVault.address);
			set_toVaultsList(vaultList);
			if (toVault.scope !== 'usd' || fromVault.address === toVault.address || !V2Paths.includes(toAddress(toVault.address)))
				set_toVault(vaultList[0]);
		} else if (fromVault.scope === 'eur') {
			const	vaultList = BOWSWAP_CRV_EUR_VAULTS.filter(e => e.address !== fromVault.address);
			set_toVaultsList(vaultList);
			if (toVault.scope !== 'eur' || fromVault.address === toVault.address || !V2Paths.includes(toAddress(toVault.address)))
				set_toVault(vaultList[0]);
		} else {
			set_toVaultsList([]);
			if (!V2Paths.includes(toVault.address) || toVault.scope !== 'v2') {
				set_toVault(V2VaultList[0]);
			}
		}

		if (provider)
			fetchFromVaultVirtualPrice();
		set_nonce(n => n + 1);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fromVault.address, provider]);

	/**************************************************************************
	**	Any time the fromVault address is changed, we need to change the list
	**	of addresses that can be used as `TO` vaults. With BowswapV2 there is
	**	two available list, the Legacy (aka metapool, aka btc <> btc or
	**	usd <> usd), and the V2, allowing swap between pools.
	**
	**	@TRIGGER : any time the `TO` vault changes
	**************************************************************************/
	useEffect(() => {
		if (provider) {
			fetchToVaultVirtualPrice();
			set_nonce(n => n + 1);
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [toVault?.address, provider]);


	/**************************************************************************
	**	This is used to get the estimateOut based on the current inputed
	**	amount. This is triggered with a delay to avoid too many requests
	**
	**	@TRIGGER : any time the debouncedFetchExpectedAmount can be called,
	**	plus when the `FROM` vault changes or the `TO` vault changes
	**************************************************************************/
	useEffect(() => {
		if (Number(fromAmount) !== 0) {
			set_isFetchingExpectedReceiveAmount(true);
			fetchEstimateOut(fromVault.address, toVault.address, ethers.utils.parseUnits(fromAmount, fromVault.decimals));
			set_nonce(n => n + 1);
		} else {
			set_expectedReceiveAmount('');
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [debouncedFetchExpectedAmount, fromAmount, fromVault.address, toVault?.address, fromVault.decimals]);


	function	renderMiddlePart() {
		const	getArgs = () => {
			if (txApproveStatus.pending || txSwapStatus.pending)
				return {open: true, title: 'PENDING...', color: 'bg-pending', icon: <Pending width={24} height={24} className={'mr-4'} />};
			if (txApproveStatus.success && !txApproveStatus.hide)
				return {open: true, title: 'APPROVE COMPLETED', color: 'bg-success', icon: <Success width={24} height={24} className={'mr-4'} />};
			if (txSwapStatus.success)
				return {open: true, title: 'SWAP COMPLETED', color: 'bg-success', icon: <Success width={24} height={24} className={'mr-4'} />};
			if (txSwapStatus.error && txSwapStatus.message)
				return {open: true, title: txSwapStatus.message, color: 'bg-error', icon: <Error width={28} height={24} className={'mr-4'} />};
			if (txSwapStatus.error)
				return {open: true, title: 'SWAP FAILED', color: 'bg-error', icon: <Error width={28} height={24} className={'mr-4'} />};
			if (txApproveStatus.error && txApproveStatus.message)
				return {open: true, title: txApproveStatus.message, color: 'bg-error', icon: <Error width={28} height={24} className={'mr-4'} />};
			if (txApproveStatus.error)
				return {open: true, title: 'APPROVE TRANSACTION FAILURE', color: 'bg-error', icon: <Error width={28} height={24} className={'mr-4'} />};
			if (Number(fromAmount) > Number(ethers.utils.formatUnits(balancesOf[fromVault.address]?.toString() || '0', fromVault.decimals)))
				return {open: true, title: 'EXCEEDED BALANCE LIMIT !', color: 'bg-error', icon: <Error width={28} height={24} className={'mr-4'} />};

			if (fromVault.scope === 'v2' && toVault?.scope === 'v2' && fromVault.type === 'usd' && toVault?.type !== 'usd')
				return {open: true, title: 'You are moving from a USD pegged asset to a more volatile crypto asset', color: 'bg-pending', icon: <Error width={28} height={24} className={'mr-4'} />};
			if (fromVault.scope !== 'v2' && toVault?.scope === 'v2' && fromVault.scope === 'usd' && toVault?.type !== 'usd')
				return {open: true, title: 'You are moving from a USD pegged asset to a more volatile crypto asset', color: 'bg-pending', icon: <Error width={28} height={24} className={'mr-4'} />};
			if (fromVault.scope === 'v2' && toVault?.scope === 'v2' && fromVault.type !== 'usd' && toVault?.type === 'usd')
				return {open: true, title: 'You are moving from a volatile crypto asset to a USD pegged asset', color: 'bg-pending', icon: <Error width={28} height={24} className={'mr-4'} />};
			if (fromVault.scope !== 'v2' && toVault?.scope === 'v2' && fromVault.scope !== 'usd' && toVault?.type === 'usd')
				return {open: true, title: 'You are moving from a volatile crypto asset to a USD pegged asset', color: 'bg-pending', icon: <Error width={28} height={24} className={'mr-4'} />};

			if (fromVault.scope === 'v2' && toVault?.scope === 'v2' && fromVault.type === 'eur' && toVault?.type !== 'eur')
				return {open: true, title: 'You are moving from a EUR pegged asset to a more volatile crypto asset', color: 'bg-pending', icon: <Error width={28} height={24} className={'mr-4'} />};
			if (fromVault.scope !== 'v2' && toVault?.scope === 'v2' && fromVault.scope === 'eur' && toVault?.type !== 'eur')
				return {open: true, title: 'You are moving from a EUR pegged asset to a more volatile crypto asset', color: 'bg-pending', icon: <Error width={28} height={24} className={'mr-4'} />};
			if (fromVault.scope === 'v2' && toVault?.scope === 'v2' && fromVault.type !== 'eur' && toVault?.type === 'eur')
				return {open: true, title: 'You are moving from a volatile crypto asset to a EUR pegged asset', color: 'bg-pending', icon: <Error width={28} height={24} className={'mr-4'} />};
			if (fromVault.scope !== 'v2' && toVault?.scope === 'v2' && fromVault.scope !== 'eur' && toVault?.type === 'eur')
				return {open: true, title: 'You are moving from a volatile crypto asset to a EUR pegged asset', color: 'bg-pending', icon: <Error width={28} height={24} className={'mr-4'} />};

			if (Number(slippage) >= 3)
				return {open: true, title: 'HEAVY SLIPPAGE, USE IT AT YOUR OWN RISK', color: 'bg-error', icon: <Error width={28} height={24} className={'mr-4'} />};
			if (Number(slippage) === 0)
				return {open: true, title: 'NO SLIPPAGE, USE IT AT YOUR OWN RISK', color: 'bg-error', icon: <Error width={28} height={24} className={'mr-4'} />};
			return {open: false, title: '', color: 'bg-yblue', icon: <div/>};
		};
		return (
			<BlockStatus {...getArgs()} />
		);
	}

	const	isAllowed = fromAmount !== '' && Number(fromAmount) > 0 && ethers.BigNumber.from(allowances?.[fromVault.address] || 0)?.gte(ethers.utils.parseUnits(fromAmount || '0', fromVault.decimals || 18));
	return (
		<div className={'w-full max-w-2xl'}>
			<div className={'bg-white rounded-xl shadow-base p-4 w-full relative space-y-0 md:space-y-4'}>
				<SectionFromVault
					disabled={!txApproveStatus.none || (!txSwapStatus.none && !txSwapStatus.success)}
					vaults={[...BOWSWAP_CRV_USD_VAULTS, ...BOWSWAP_CRV_BTC_VAULTS, ...BOWSWAP_CRV_EUR_VAULTS, ...BOWSWAP_CRV_V2_VAULTS]}
					fromVault={fromVault}
					set_fromVault={set_fromVault}
					fromAmount={fromAmount}
					set_fromAmount={set_fromAmount}
					fromCounterValue={fromCounterValue}
					balanceOf={balancesOf[fromVault.address]?.toString() || '0'}
					slippage={slippage}
					set_slippage={set_slippage}
					yearnVaultData={yearnVaultData} />

				<div className={'flex w-full justify-center pt-4'}>
					{renderMiddlePart()}
				</div>

				<SectionToVault
					disabled={!txApproveStatus.none || (!txSwapStatus.none && !txSwapStatus.success)}
					vaults={[...toVaultsList, ...toVaultsListV2]}
					toVault={toVault}
					set_toVault={set_toVault}
					expectedReceiveAmount={expectedReceiveAmount}
					toCounterValue={toCounterValue}
					slippage={slippage}
					balanceOf={balancesOf[toVault.address]?.toString() || '0'}
					isFetchingExpectedReceiveAmount={isFetchingExpectedReceiveAmount}
					yearnVaultData={yearnVaultData} />

				<div className={'flex flex-row justify-center pt-8 w-full space-x-4'}>
					<ButtonApprove
						disabled={(Number(fromAmount) > Number(ethers.utils.formatUnits(balancesOf[fromVault.address]?.toString() || '0', fromVault.decimals)) || txApproveStatus.success || isAllowed )}
						approved={txApproveStatus.success || isAllowed}
						fromVault={fromVault}
						fromAmount={fromAmount}
						set_signature={set_signature}
						canSign={canSign}
						onCallback={(type, message) => {
							set_txApproveStatus({none: false, pending: type === 'pending', error: type === 'error', success: type === 'success', message});
							if (type === 'error') {
								setTimeout(() => set_txApproveStatus((s) => s.error ? {none: true, pending: false, error: false, success: false, message} : s), 2500);
							}
							if (type === 'success') {
								updateBalanceOf([fromVault.address]);
								setTimeout(() => set_txApproveStatus({none: false, pending: false, error: false, success: true, hide: true, message: null}), 2500);
							}
						}} />
					<ButtonSwap
						disabled={Number(fromAmount) > Number(ethers.utils.formatUnits(balancesOf[fromVault.address]?.toString() || '0', fromVault.decimals))}
						approved={txApproveStatus.success || isAllowed || signature}
						fromVault={fromVault}
						toVault={toVault}
						fromAmount={fromAmount}
						expectedReceiveAmount={expectedReceiveAmount}
						slippage={slippage}
						signature={signature}
						shouldIncreaseGasLimit={Number(balanceOfFromVault) < Number(fromAmount)}
						onCallback={(type, message) => {
							set_txApproveStatus({none: false, pending: false, error: false, success: true, hide: true, message: null});

							set_txSwapStatus({none: false, pending: type === 'pending', error: type === 'error', success: type === 'success', message});
							if (type === 'error') {
								if (message === 'INVALID SIGNATURE, FALLBACK TO DEFAULT FLOW') {
									setTimeout(() => {
										set_canSign(false);
										set_signature(null);
										set_txApproveStatus({none: true, pending: false, error: false, success: false, message: undefined});
										set_txSwapStatus({none: true, pending: false, error: false, success: false});
									}, 2500);

								} else {
									setTimeout(() => set_txSwapStatus((s) => s.error ? {none: true, pending: false, error: false, success: false, message} : s), 2500);
								}
							}
							if (type === 'success') {
								updateBalanceOf([fromVault.address, toVault.address]);
								setTimeout(() => set_txSwapStatus({none: true, pending: false, error: false, success: false}), 2500);
								resetStates();
							}
						}}
					/>
				</div>
			</div>
		</div>
	);
}

export default Bowswap;