import	React, {useEffect, useRef}		from	'react';
import	usePaths						from	'contexts/usePaths';
import	usePrices						from	'contexts/usePrices';
import	PopoverSettings					from	'components/Bowswap/PopoverSettings';
import	{toAddress}						from	'utils';

function	InputToken({
	value, set_value,
	options, set_options,
	balanceOf, disabled
}) {
	const	inputRef = useRef();
	const	{fromVault} = usePaths();
	const	{virtualPrices} = usePrices();
	const	[isMounted, set_isMounted] = React.useState(false);

	useEffect(() => {
		if (inputRef?.current) {
			let inputWitdh = (value.length * 20) + 3;
			if (String(value).includes('.')) {
				inputWitdh -= 10;
			}
			if (value.length >= 9) {
				inputWitdh += 3;
			}
			if (value.length === 0) {
				inputRef.current.style.width = `${1}px`;
			} else {
				inputRef.current.style.width = `${inputWitdh + 1}px`;
			}
			set_isMounted(true);
		}
	}, [value]);

	function	updateInputValue(newValue) {
		if (disabled) {
			return;
		}
		let		_value = newValue.replaceAll('..', '.').replaceAll(/[^0-9.]/g, '');
		const	[dec, frac] = _value.split('.');
		if (frac) _value = `${dec}.${frac.slice(0, 12)}`;

		if (_value === '.') {
			set_value('0.');
		} else if (_value.length > 0 && _value[0] === '-') {
			set_value('');
		} else if (_value.length >= 2 && _value[0] === '0' && _value[1] !== '.') {
			set_value(_value.slice(1) || '');
		} else {
			set_value(_value || '');
		}
	}

	return (
		<div className={'w-full text-left bg-ygray-100 rounded-lg cursor-default focus:outline-none flex flex-col justify-between text-ygray-800 h-24 py-2 px-2 space-y-1'}>
			<div className={'h-4'}>
				<div className={'flex flex-row items-center justify-end w-full'}>
					<label
						onClick={() => updateInputValue(balanceOf)}
						className={`font-normal text-ybase text-ygray-500 hidden md:flex flex-row items-center ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
						{`Balance: ${Number(balanceOf) !== 0 && Number(balanceOf) < 0.001 ? '< 0.001' : Number(balanceOf)}`}
					</label>
					<label
						onClick={() => updateInputValue(balanceOf)}
						className={`font-normal text-ybase text-ygray-500 flex flex-row items-center md:hidden ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
						{`Balance: ${Number(balanceOf).toFixed(8)}`}
					</label>
				</div>
			</div>
			<label
				htmlFor={'fromInput'}
				className={`with-placeholder placeholder-${!isMounted ? 100 : value.length} flex justify-end w-full h-10 text-4xl font-medium text-ygray-900 text-opacity-20 proportional-nums cursor-text ${disabled ? 'cursor-not-allowed' : 'cursor-text'}`}>
				<input
					ref={inputRef}
					id={'fromInput'}
					name={'fromInput'}
					autoComplete={'off'}
					disabled={disabled}
					readOnly={disabled}
					value={value}
					onChange={(e) => updateInputValue(e.target.value)}
					style={{backgroundColor: 'transparent'}}
					className={`block w-full text-4xl font-medium h-full text-right ${disabled ? 'cursor-not-allowed' : 'cursor-text'} ${Number(value) > Number(balanceOf) ? 'text-error' : 'text-ygray-900'}`}
					type={'text'}
					min={0} />
			</label>
			<div className={'h-4'}>
				<div className={'flex w-full justify-between items-center relative'}>
					<div className={'items-center text-ybase text-ygray-500'}>
						<span>{`≃ $${((virtualPrices?.[toAddress(fromVault?.address)] || 1) * Number(value)).toFixed(2)}`}</span>
					</div>
					<div className={'flex flex-row items-center'}>
						<button
							onClick={() => updateInputValue(balanceOf)}
							className={`items-center text-xxs font-medium py-0.5 text-white bg-yblue hover:bg-yblue-hover focus:outline-none px-3 rounded-lg transition-colors h-5 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
							<span>{'MAX'}</span>
						</button>
						<PopoverSettings options={options} set_options={set_options} />
					</div>
				</div>
			</div>
		</div>
	);
}

export default InputToken;