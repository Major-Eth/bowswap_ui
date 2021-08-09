/******************************************************************************
**	@Author:				Thomas Bouder <Tbouder>
**	@Email:					Tbouder@protonmail.com
**	@Date:					Saturday July 31st 2021
**	@Filename:				Error.js
******************************************************************************/

import	React				from	'react';

function Icon({width = 84, height = 76, className}) {
	return (
		<>
			<svg className={className} width={width} height={height} viewBox={'0 0 84 76'} fill={'none'} xmlns={'http://www.w3.org/2000/svg'}>
				<path d={'M82.6848 60.093L51.119 5.30233C49.3653 2.12093 45.858 0 42 0C38.142 0 34.6347 2.12093 32.881 5.30233L1.31524 60.093C-0.438413 63.2744 -0.438413 67.5163 1.31524 70.6977C3.41962 73.8791 6.5762 76 10.4342 76H73.5658C77.4238 76 80.9311 73.8791 82.6848 70.6977C84.4384 67.1628 84.4384 63.2744 82.6848 60.093ZM76.7223 67.1628C76.3716 67.8698 75.6702 68.9302 73.5658 68.9302H10.4342C8.68058 68.9302 7.62839 67.5163 7.27766 67.1628C6.92693 66.8093 6.22547 65.0419 7.27766 63.6279L38.8434 8.83721C39.8956 7.06977 41.2985 7.06977 42 7.06977C42.7015 7.06977 44.1044 7.06977 45.1566 8.83721L76.7223 63.6279C77.4238 65.0419 76.7223 66.4558 76.7223 67.1628Z'} fill={'white'}/>
				<path d={'M42.0002 19.4419C39.8958 19.4419 38.4929 20.8558 38.4929 22.9767V44.186C38.4929 46.307 39.8958 47.7209 42.0002 47.7209C44.1046 47.7209 45.5075 46.307 45.5075 44.186V22.9767C45.5075 20.8558 44.1046 19.4419 42.0002 19.4419Z'} fill={'white'}/>
				<path d={'M42.0002 61.8605C43.9372 61.8605 45.5075 60.2778 45.5075 58.3256C45.5075 56.3733 43.9372 54.7907 42.0002 54.7907C40.0632 54.7907 38.4929 56.3733 38.4929 58.3256C38.4929 60.2778 40.0632 61.8605 42.0002 61.8605Z'} fill={'white'}/>
			</svg>

		</>
	);
}

export default Icon;