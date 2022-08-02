module.exports = [
  {
    from: 'dataId',
    to: 'dataId',
    type: 'Mixed',
    isArray: false,
    shape: null
  },
  {
    from: 'dataLink',
    to: 'dataLink',
    type: 'Mixed',
    isArray: false,
    shape: null
  },
  {
    from: 'network',
    to: 'network',
    type: 'Network',
    isArray: false,
    shape: null
  },
  {
    from: 'workspaces',
    to: 'workspaces',
    type: 'Workspace',
    isArray: true,
    shape: null
  },
  {
    from: 'dataChannels',
    to: 'dataChannels',
    type: 'Mixed',
    isArray: true,
    shape: null
  },
  {
    from: 'isMapped',
    to: 'isMapped',
    type: 'Boolean',
    isArray: false,
    shape: null
  },
  {
    from: 'isParkingArea',
    to: 'isParkingArea',
    type: 'Boolean',
    isArray: false,
    shape: null
  },
  {
    from: 'isCampusNavEnabled',
    to: 'isCampusNavEnabled',
    type: 'Boolean',
    isArray: false,
    shape: null
  },
  {
    from: 'inheritAddress',
    to: 'inheritAddress',
    type: 'Boolean',
    isArray: false,
    shape: null
  },
  {
    from: 'publishingStatus',
    to: 'publishingStatus',
    type: 'PublishingStatus',
    isArray: false,
    shape: [
      {
        from: 'complete',
        to: 'complete',
        type: 'Boolean',
        isArray: false,
        shape: null
      },
      {
        from: 'missingFields',
        to: 'missingFields',
        type: 'Mixed',
        isArray: true,
        shape: null
      },
      {
        from: '_id',
        to: 'id',
        type: 'ID',
        isArray: false,
        shape: null
      }
    ]
  },
  {
    from: 'externalId',
    to: 'externalId',
    type: 'Int',
    isArray: false,
    shape: null
  },
  {
    from: 'waitTime',
    to: 'waitTime',
    type: 'Int',
    isArray: false,
    shape: null
  },
  {
    from: 'waitTimeToken',
    to: 'waitTimeToken',
    type: 'String',
    isArray: false,
    shape: null
  },
  {
    from: 'departmentIds',
    to: 'departmentIds',
    type: 'String',
    isArray: true,
    shape: null
  },
  {
    from: 'metadata',
    to: 'metadata',
    type: 'PlaceMetaData',
    isArray: false,
    shape: [
      {
        from: 'ui',
        to: 'ui',
        type: 'PlaceMetaDataUI',
        isArray: false,
        shape: [
          {
            from: 'autoPopulateCoordinatesFromAddress',
            to: 'autoPopulateCoordinatesFromAddress',
            type: 'Boolean',
            isArray: false,
            shape: null
          }
        ]
      },
      {
        from: '_id',
        to: 'id',
        type: 'ID',
        isArray: false,
        shape: null
      }
    ]
  },
  {
    from: 'order',
    to: 'order',
    type: 'Int',
    isArray: false,
    shape: null
  },
  {
    from: 'isPromotionItem',
    to: 'isPromotionItem',
    type: 'Boolean',
    isArray: false,
    shape: null
  },
  {
    from: 'v8Migrated',
    to: 'v8Migrated',
    type: 'Boolean',
    isArray: false,
    shape: null
  },
  {
    from: 'validation',
    to: 'validation',
    type: 'DataValidation',
    isArray: false,
    shape: [
      {
        from: 'status',
        to: 'status',
        type: 'ValidationStatusEnum',
        isArray: false,
        shape: null
      },
      {
        from: 'errors',
        to: 'errors',
        type: 'ValidationError',
        isArray: true,
        shape: [
          {
            from: 'message',
            to: 'message',
            type: 'String',
            isArray: false,
            shape: null
          },
          {
            from: 'path',
            to: 'path',
            type: 'String',
            isArray: true,
            shape: null
          },
          {
            from: 'type',
            to: 'type',
            type: 'String',
            isArray: false,
            shape: null
          },
          {
            from: 'context',
            to: 'context',
            type: 'ValidationErrorContext',
            isArray: false,
            shape: [
              {
                from: 'key',
                to: 'key',
                type: 'String',
                isArray: false,
                shape: null
              },
              {
                from: 'label',
                to: 'label',
                type: 'String',
                isArray: false,
                shape: null
              },
              {
                from: 'value',
                to: 'value',
                type: 'Mixed',
                isArray: false,
                shape: null
              }
            ]
          }
        ]
      },
      {
        from: 'validators',
        to: 'validators',
        type: 'DataValidator',
        isArray: true,
        shape: [
          {
            from: 'target',
            to: 'target',
            type: 'String',
            isArray: false,
            shape: null
          },
          {
            from: 'status',
            to: 'status',
            type: 'ValidationStatusEnum',
            isArray: false,
            shape: null
          },
          {
            from: 'errors',
            to: 'errors',
            type: 'ValidationError',
            isArray: true,
            shape: [
              {
                from: 'message',
                to: 'message',
                type: 'String',
                isArray: false,
                shape: null
              },
              {
                from: 'path',
                to: 'path',
                type: 'String',
                isArray: true,
                shape: null
              },
              {
                from: 'type',
                to: 'type',
                type: 'String',
                isArray: false,
                shape: null
              },
              {
                from: 'context',
                to: 'context',
                type: 'ValidationErrorContext',
                isArray: false,
                shape: [
                  {
                    from: 'key',
                    to: 'key',
                    type: 'String',
                    isArray: false,
                    shape: null
                  },
                  {
                    from: 'label',
                    to: 'label',
                    type: 'String',
                    isArray: false,
                    shape: null
                  },
                  {
                    from: 'value',
                    to: 'value',
                    type: 'Mixed',
                    isArray: false,
                    shape: null
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        from: 'createdAt',
        to: 'createdAt',
        type: 'AutoGraphDateTime',
        isArray: false,
        shape: null
      },
      {
        from: 'updatedAt',
        to: 'updatedAt',
        type: 'AutoGraphDateTime',
        isArray: false,
        shape: null
      }
    ]
  },
  {
    from: 'name',
    to: 'name',
    type: 'MultiLang',
    isArray: false,
    shape: null
  },
  {
    from: 'shortName',
    to: 'shortName',
    type: 'MultiLang',
    isArray: false,
    shape: null
  },
  {
    from: 'description',
    to: 'description',
    type: 'MultiLang',
    isArray: false,
    shape: null
  },
  {
    from: 'defaultImage',
    to: 'defaultImage',
    type: 'Image',
    isArray: false,
    shape: null
  },
  {
    from: 'kioskMapImage',
    to: 'kioskMapImage',
    type: 'KioskMapImage',
    isArray: false,
    shape: [
      {
        from: 'image',
        to: 'image',
        type: 'Image',
        isArray: false,
        shape: null
      },
      {
        from: 'cornerLocations',
        to: 'cornerLocations',
        type: 'CornerLocations',
        isArray: false,
        shape: [
          {
            from: 'left',
            to: 'left',
            type: 'Float',
            isArray: false,
            shape: null
          },
          {
            from: 'right',
            to: 'right',
            type: 'Float',
            isArray: false,
            shape: null
          },
          {
            from: 'top',
            to: 'top',
            type: 'Float',
            isArray: false,
            shape: null
          },
          {
            from: 'bottom',
            to: 'bottom',
            type: 'Float',
            isArray: false,
            shape: null
          },
          {
            from: '_id',
            to: 'id',
            type: 'ID',
            isArray: false,
            shape: null
          },
          {
            from: 'createdAt',
            to: 'createdAt',
            type: 'AutoGraphDateTime',
            isArray: false,
            shape: null
          },
          {
            from: 'updatedAt',
            to: 'updatedAt',
            type: 'AutoGraphDateTime',
            isArray: false,
            shape: null
          }
        ]
      },
      {
        from: 'rotationAngle',
        to: 'rotationAngle',
        type: 'Int',
        isArray: false,
        shape: null
      },
      {
        from: '_id',
        to: 'id',
        type: 'ID',
        isArray: false,
        shape: null
      },
      {
        from: 'createdAt',
        to: 'createdAt',
        type: 'AutoGraphDateTime',
        isArray: false,
        shape: null
      },
      {
        from: 'updatedAt',
        to: 'updatedAt',
        type: 'AutoGraphDateTime',
        isArray: false,
        shape: null
      }
    ]
  },
  {
    from: 'placeholderImage',
    to: 'placeholderImage',
    type: 'Image',
    isArray: false,
    shape: null
  },
  {
    from: 'dataType',
    to: 'designation',
    type: 'PlaceDesignation',
    isArray: false,
    shape: null
  },
  {
    from: 'media',
    to: 'media',
    type: 'Media',
    isArray: true,
    shape: null
  },
  {
    from: 'contact',
    to: 'contact',
    type: 'PlaceContact',
    isArray: false,
    shape: [
      {
        from: 'fax',
        to: 'fax',
        type: 'Phone',
        isArray: false,
        shape: null
      },
      {
        from: 'phone',
        to: 'phone',
        type: 'Phone',
        isArray: false,
        shape: null
      },
      {
        from: 'email',
        to: 'email',
        type: 'Email',
        isArray: false,
        shape: null
      },
      {
        from: 'hours',
        to: 'hours',
        type: 'BusinessHours',
        isArray: false,
        shape: [
          {
            from: 'name',
            to: 'name',
            type: 'MultiLang',
            isArray: false,
            shape: null
          },
          {
            from: 'description',
            to: 'description',
            type: 'MultiLang',
            isArray: false,
            shape: null
          },
          {
            from: 'startDate',
            to: 'startDate',
            type: 'DateTime',
            isArray: false,
            shape: null
          },
          {
            from: 'endDate',
            to: 'endDate',
            type: 'DateTime',
            isArray: false,
            shape: null
          },
          {
            from: 'type',
            to: 'type',
            type: 'BusinessHoursType',
            isArray: false,
            shape: null
          },
          {
            from: 'custom',
            to: 'custom',
            type: 'CustomBusinessHours',
            isArray: true,
            shape: [
              {
                from: 'day',
                to: 'day',
                type: 'DayOfTheWeek',
                isArray: false,
                shape: null
              },
              {
                from: 'status',
                to: 'status',
                type: 'BusinessHoursStatus',
                isArray: false,
                shape: null
              },
              {
                from: 'hours',
                to: 'hours',
                type: 'Timeslot',
                isArray: true,
                shape: [
                  {
                    from: 'startTime',
                    to: 'startTime',
                    type: 'Time',
                    isArray: false,
                    shape: null
                  },
                  {
                    from: 'endTime',
                    to: 'endTime',
                    type: 'Time',
                    isArray: false,
                    shape: null
                  }
                ]
              },
              {
                from: '_id',
                to: 'id',
                type: 'ID',
                isArray: false,
                shape: null
              },
              {
                from: 'createdAt',
                to: 'createdAt',
                type: 'AutoGraphDateTime',
                isArray: false,
                shape: null
              },
              {
                from: 'updatedAt',
                to: 'updatedAt',
                type: 'AutoGraphDateTime',
                isArray: false,
                shape: null
              }
            ]
          },
          {
            from: '_id',
            to: 'id',
            type: 'ID',
            isArray: false,
            shape: null
          },
          {
            from: 'createdAt',
            to: 'createdAt',
            type: 'AutoGraphDateTime',
            isArray: false,
            shape: null
          },
          {
            from: 'updatedAt',
            to: 'updatedAt',
            type: 'AutoGraphDateTime',
            isArray: false,
            shape: null
          }
        ]
      },
      {
        from: 'exceptionHours',
        to: 'exceptionHours',
        type: 'BusinessHours',
        isArray: true,
        shape: [
          {
            from: 'name',
            to: 'name',
            type: 'MultiLang',
            isArray: false,
            shape: null
          },
          {
            from: 'description',
            to: 'description',
            type: 'MultiLang',
            isArray: false,
            shape: null
          },
          {
            from: 'startDate',
            to: 'startDate',
            type: 'DateTime',
            isArray: false,
            shape: null
          },
          {
            from: 'endDate',
            to: 'endDate',
            type: 'DateTime',
            isArray: false,
            shape: null
          },
          {
            from: 'type',
            to: 'type',
            type: 'BusinessHoursType',
            isArray: false,
            shape: null
          },
          {
            from: 'custom',
            to: 'custom',
            type: 'CustomBusinessHours',
            isArray: true,
            shape: [
              {
                from: 'day',
                to: 'day',
                type: 'DayOfTheWeek',
                isArray: false,
                shape: null
              },
              {
                from: 'status',
                to: 'status',
                type: 'BusinessHoursStatus',
                isArray: false,
                shape: null
              },
              {
                from: 'hours',
                to: 'hours',
                type: 'Timeslot',
                isArray: true,
                shape: [
                  {
                    from: 'startTime',
                    to: 'startTime',
                    type: 'Time',
                    isArray: false,
                    shape: null
                  },
                  {
                    from: 'endTime',
                    to: 'endTime',
                    type: 'Time',
                    isArray: false,
                    shape: null
                  }
                ]
              },
              {
                from: '_id',
                to: 'id',
                type: 'ID',
                isArray: false,
                shape: null
              },
              {
                from: 'createdAt',
                to: 'createdAt',
                type: 'AutoGraphDateTime',
                isArray: false,
                shape: null
              },
              {
                from: 'updatedAt',
                to: 'updatedAt',
                type: 'AutoGraphDateTime',
                isArray: false,
                shape: null
              }
            ]
          },
          {
            from: '_id',
            to: 'id',
            type: 'ID',
            isArray: false,
            shape: null
          },
          {
            from: 'createdAt',
            to: 'createdAt',
            type: 'AutoGraphDateTime',
            isArray: false,
            shape: null
          },
          {
            from: 'updatedAt',
            to: 'updatedAt',
            type: 'AutoGraphDateTime',
            isArray: false,
            shape: null
          }
        ]
      }
    ]
  },
  {
    from: 'timezone',
    to: 'timezone',
    type: 'Timezone',
    isArray: false,
    shape: null
  },
  {
    from: 'actionLinks',
    to: 'actionLinks',
    type: 'ActionLink',
    isArray: true,
    shape: [
      {
        from: '_id',
        to: 'id',
        type: 'ID',
        isArray: false,
        shape: null
      },
      {
        from: 'data',
        to: 'data',
        type: 'Mixed',
        isArray: false,
        shape: null
      },
      {
        from: 'name',
        to: 'name',
        type: 'MultiLang',
        isArray: false,
        shape: null
      },
      {
        from: 'shortName',
        to: 'shortName',
        type: 'MultiLang',
        isArray: false,
        shape: null
      },
      {
        from: 'type',
        to: 'type',
        type: 'ActionLinkType',
        isArray: false,
        shape: null
      },
      {
        from: 'order',
        to: 'order',
        type: 'Int',
        isArray: false,
        shape: null
      },
      {
        from: 'image_id',
        to: 'icon',
        type: 'Icon',
        isArray: false,
        shape: null
      },
      {
        from: 'categories',
        to: 'categories',
        type: 'Category',
        isArray: true,
        shape: null
      },
      {
        from: 'category',
        to: 'category',
        type: 'Category',
        isArray: false,
        shape: null
      },
      {
        from: 'curatedList',
        to: 'curatedList',
        type: 'NetworkCuratedList',
        isArray: false,
        shape: null
      },
      {
        from: 'destination',
        to: 'destination',
        type: 'AppDestination',
        isArray: false,
        shape: [
          {
            from: 'id',
            to: 'id',
            type: 'ID',
            isArray: false,
            shape: null
          },
          {
            from: 'type',
            to: 'type',
            type: 'String',
            isArray: false,
            shape: null
          },
          {
            from: 'label',
            to: 'label',
            type: 'String',
            isArray: false,
            shape: null
          }
        ]
      },
      {
        from: 'url',
        to: 'url',
        type: 'String',
        isArray: false,
        shape: null
      },
      {
        from: 'showInDashboardView',
        to: 'showInDashboardView',
        type: 'Boolean',
        isArray: false,
        shape: null
      },
      {
        from: 'createdAt',
        to: 'createdAt',
        type: 'AutoGraphDateTime',
        isArray: false,
        shape: null
      },
      {
        from: 'updatedAt',
        to: 'updatedAt',
        type: 'AutoGraphDateTime',
        isArray: false,
        shape: null
      }
    ]
  },
  {
    from: 'tags',
    to: 'tags',
    type: 'NetworkPlaceTag',
    isArray: true,
    shape: [
      {
        from: 'name',
        to: 'name',
        type: 'NetworkPlaceTagMultiLang',
        isArray: false,
        shape: null
      },
      {
        from: 'weight',
        to: 'weight',
        type: 'Mixed',
        isArray: false,
        shape: null
      },
      {
        from: '_id',
        to: 'id',
        type: 'ID',
        isArray: false,
        shape: null
      },
      {
        from: 'createdAt',
        to: 'createdAt',
        type: 'AutoGraphDateTime',
        isArray: false,
        shape: null
      },
      {
        from: 'updatedAt',
        to: 'updatedAt',
        type: 'AutoGraphDateTime',
        isArray: false,
        shape: null
      }
    ]
  },
  {
    from: 'categories',
    to: 'categories',
    type: 'Category',
    isArray: true,
    shape: null
  },
  {
    from: 'searchability',
    to: 'searchability',
    type: 'PlaceSearchability',
    isArray: false,
    shape: null
  },
  {
    from: 'navigation',
    to: 'navigation',
    type: 'PlaceNavigation',
    isArray: false,
    shape: [
      {
        from: 'arrivalImage',
        to: 'arrivalImage',
        type: 'Image',
        isArray: false,
        shape: null
      },
      {
        from: 'reroute',
        to: 'reroute',
        type: 'PlaceReroute',
        isArray: false,
        shape: [
          {
            from: 'directive',
            to: 'directive',
            type: 'PlaceRerouteDirective',
            isArray: false,
            shape: null
          },
          {
            from: 'destination',
            to: 'destination',
            type: 'NetworkPlace',
            isArray: false,
            shape: null
          },
          {
            from: 'message',
            to: 'message',
            type: 'MultiLang',
            isArray: false,
            shape: null
          },
          {
            from: 'image',
            to: 'image',
            type: 'Image',
            isArray: false,
            shape: null
          }
        ]
      },
      {
        from: 'defaultPlace',
        to: 'defaultPlace',
        type: 'NetworkPlace',
        isArray: false,
        shape: null
      },
      {
        from: 'parkingType',
        to: 'parkingType',
        type: 'PlaceParkingType',
        isArray: false,
        shape: null
      },
      {
        from: 'enableStrictParkingArrival',
        to: 'enableStrictParkingArrival',
        type: 'Boolean',
        isArray: false,
        shape: null
      },
      {
        from: 'enableAlternateNavigation',
        to: 'enableAlternateNavigation',
        type: 'Boolean',
        isArray: false,
        shape: null
      },
      {
        from: 'disclaimer',
        to: 'disclaimer',
        type: 'MultiLang',
        isArray: false,
        shape: null
      },
      {
        from: '_id',
        to: 'id',
        type: 'ID',
        isArray: false,
        shape: null
      }
    ]
  },
  {
    from: 'visibility',
    to: 'visibility',
    type: 'PlaceVisibility',
    isArray: false,
    shape: null
  },
  {
    from: 'matching',
    to: 'matching',
    type: 'PlaceMatching',
    isArray: false,
    shape: [
      {
        from: 'enabled',
        to: 'enabled',
        type: 'Boolean',
        isArray: false,
        shape: null
      },
      {
        from: 'rule',
        to: 'rule',
        type: 'JSONLogic',
        isArray: false,
        shape: null
      },
      {
        from: '_id',
        to: 'id',
        type: 'ID',
        isArray: false,
        shape: null
      }
    ]
  },
  {
    from: 'isDefault',
    to: 'isDefault',
    type: 'Boolean',
    isArray: false,
    shape: null
  },
  {
    from: 'priority',
    to: 'priority',
    type: 'Int',
    isArray: false,
    shape: null
  },
  {
    from: 'geoLocation',
    to: 'geoLocation',
    type: 'GeoLocation',
    isArray: false,
    shape: [
      {
        from: 'address',
        to: 'address',
        type: 'NetworkPlaceAddress',
        isArray: false,
        shape: [
          {
            from: 'streetNumber',
            to: 'streetNumber',
            type: 'String',
            isArray: false,
            shape: null
          },
          {
            from: 'streetName',
            to: 'streetName',
            type: 'String',
            isArray: false,
            shape: null
          },
          {
            from: 'street',
            to: 'street',
            type: 'String',
            isArray: false,
            shape: null
          },
          {
            from: 'building',
            to: 'building',
            type: 'String',
            isArray: false,
            shape: null
          },
          {
            from: 'floor',
            to: 'floor',
            type: 'String',
            isArray: false,
            shape: null
          },
          {
            from: 'suite',
            to: 'suite',
            type: 'String',
            isArray: false,
            shape: null
          },
          {
            from: 'city',
            to: 'city',
            type: 'String',
            isArray: false,
            shape: null
          },
          {
            from: 'state',
            to: 'state',
            type: 'String',
            isArray: false,
            shape: null
          },
          {
            from: 'zip',
            to: 'zip',
            type: 'String',
            isArray: false,
            shape: null
          },
          {
            from: 'neighborhood',
            to: 'neighborhood',
            type: 'String',
            isArray: false,
            shape: null
          },
          {
            from: 'county',
            to: 'county',
            type: 'String',
            isArray: false,
            shape: null
          },
          {
            from: 'country',
            to: 'country',
            type: 'String',
            isArray: false,
            shape: null
          },
          {
            from: '_id',
            to: 'id',
            type: 'ID',
            isArray: false,
            shape: null
          },
          {
            from: 'createdAt',
            to: 'createdAt',
            type: 'AutoGraphDateTime',
            isArray: false,
            shape: null
          },
          {
            from: 'updatedAt',
            to: 'updatedAt',
            type: 'AutoGraphDateTime',
            isArray: false,
            shape: null
          }
        ]
      },
      {
        from: 'geoAddress',
        to: 'geoAddress',
        type: 'NetworkPlaceGeoAddress',
        isArray: false,
        shape: [
          {
            from: 'streetNumber',
            to: 'streetNumber',
            type: 'String',
            isArray: false,
            shape: null
          },
          {
            from: 'streetName',
            to: 'streetName',
            type: 'String',
            isArray: false,
            shape: null
          },
          {
            from: 'street',
            to: 'street',
            type: 'String',
            isArray: false,
            shape: null
          },
          {
            from: 'building',
            to: 'building',
            type: 'String',
            isArray: false,
            shape: null
          },
          {
            from: 'floor',
            to: 'floor',
            type: 'String',
            isArray: false,
            shape: null
          },
          {
            from: 'suite',
            to: 'suite',
            type: 'String',
            isArray: false,
            shape: null
          },
          {
            from: 'city',
            to: 'city',
            type: 'String',
            isArray: false,
            shape: null
          },
          {
            from: 'state',
            to: 'state',
            type: 'String',
            isArray: false,
            shape: null
          },
          {
            from: 'zip',
            to: 'zip',
            type: 'String',
            isArray: false,
            shape: null
          },
          {
            from: 'neighborhood',
            to: 'neighborhood',
            type: 'String',
            isArray: false,
            shape: null
          },
          {
            from: 'county',
            to: 'county',
            type: 'String',
            isArray: false,
            shape: null
          },
          {
            from: 'country',
            to: 'country',
            type: 'String',
            isArray: false,
            shape: null
          },
          {
            from: '_id',
            to: 'id',
            type: 'ID',
            isArray: false,
            shape: null
          },
          {
            from: 'createdAt',
            to: 'createdAt',
            type: 'AutoGraphDateTime',
            isArray: false,
            shape: null
          },
          {
            from: 'updatedAt',
            to: 'updatedAt',
            type: 'AutoGraphDateTime',
            isArray: false,
            shape: null
          }
        ]
      },
      {
        from: 'geoPoint',
        to: 'geoPoint',
        type: 'GeoPoint',
        isArray: false,
        shape: [
          {
            from: 'lat',
            to: 'lat',
            type: 'Latitude',
            isArray: false,
            shape: null
          },
          {
            from: 'lng',
            to: 'lng',
            type: 'Longitude',
            isArray: false,
            shape: null
          }
        ]
      },
      {
        from: 'markerPoint',
        to: 'markerPoint',
        type: 'GeoPoint',
        isArray: false,
        shape: [
          {
            from: 'lat',
            to: 'lat',
            type: 'Latitude',
            isArray: false,
            shape: null
          },
          {
            from: 'lng',
            to: 'lng',
            type: 'Longitude',
            isArray: false,
            shape: null
          }
        ]
      },
      {
        from: 'navigationPoint',
        to: 'navigationPoint',
        type: 'GeoPoint',
        isArray: false,
        shape: [
          {
            from: 'lat',
            to: 'lat',
            type: 'Latitude',
            isArray: false,
            shape: null
          },
          {
            from: 'lng',
            to: 'lng',
            type: 'Longitude',
            isArray: false,
            shape: null
          }
        ]
      },
      {
        from: 'perimeter',
        to: 'perimeter',
        type: 'GeoPerimeter',
        isArray: false,
        shape: [
          {
            from: 'shape',
            to: 'shape',
            type: 'ShapeType',
            isArray: false,
            shape: null
          },
          {
            from: 'points',
            to: 'points',
            type: 'GeoPoint',
            isArray: true,
            shape: [
              {
                from: 'lat',
                to: 'lat',
                type: 'Latitude',
                isArray: false,
                shape: null
              },
              {
                from: 'lng',
                to: 'lng',
                type: 'Longitude',
                isArray: false,
                shape: null
              }
            ]
          },
          {
            from: 'radius',
            to: 'radius',
            type: 'Float',
            isArray: false,
            shape: null
          },
          {
            from: '_id',
            to: 'id',
            type: 'ID',
            isArray: false,
            shape: null
          }
        ]
      },
      {
        from: 'plusCode',
        to: 'plusCode',
        type: 'PlusCode',
        isArray: false,
        shape: null
      },
      {
        from: '_id',
        to: 'id',
        type: 'ID',
        isArray: false,
        shape: null
      }
    ]
  },
  {
    from: 'indoorLocation',
    to: 'indoorLocation',
    type: 'IndoorLocation',
    isArray: false,
    shape: [
      {
        from: 'mapId',
        to: 'mapId',
        type: 'Int',
        isArray: false,
        shape: null
      },
      {
        from: 'mapKey',
        to: 'mapKey',
        type: 'String',
        isArray: false,
        shape: null
      },
      {
        from: 'indoorPoint',
        to: 'indoorPoint',
        type: 'IndoorPoint',
        isArray: false,
        shape: [
          {
            from: 's',
            to: 's',
            type: 'Int',
            isArray: false,
            shape: null
          },
          {
            from: 'b',
            to: 'b',
            type: 'Int',
            isArray: false,
            shape: null
          },
          {
            from: 'f',
            to: 'f',
            type: 'Int',
            isArray: false,
            shape: null
          },
          {
            from: 'x',
            to: 'x',
            type: 'Float',
            isArray: false,
            shape: null
          },
          {
            from: 'y',
            to: 'y',
            type: 'Float',
            isArray: false,
            shape: null
          }
        ]
      },
      {
        from: 'plusCode',
        to: 'plusCode',
        type: 'PlusCode',
        isArray: false,
        shape: null
      },
      {
        from: 'markerPoint',
        to: 'markerPoint',
        type: 'IndoorPointKey',
        isArray: false,
        shape: [
          {
            from: 's',
            to: 's',
            type: 'Int',
            isArray: false,
            shape: null
          },
          {
            from: 'b',
            to: 'b',
            type: 'Int',
            isArray: false,
            shape: null
          },
          {
            from: 'f',
            to: 'f',
            type: 'Int',
            isArray: false,
            shape: null
          },
          {
            from: 'k',
            to: 'k',
            type: 'String',
            isArray: false,
            shape: null
          },
          {
            from: 'x',
            to: 'x',
            type: 'Float',
            isArray: false,
            shape: null
          },
          {
            from: 'y',
            to: 'y',
            type: 'Float',
            isArray: false,
            shape: null
          },
          {
            from: '_id',
            to: 'id',
            type: 'ID',
            isArray: false,
            shape: null
          }
        ]
      },
      {
        from: 'geoPoint',
        to: 'geoPoint',
        type: 'GeoPoint',
        isArray: false,
        shape: [
          {
            from: 'lat',
            to: 'lat',
            type: 'Latitude',
            isArray: false,
            shape: null
          },
          {
            from: 'lng',
            to: 'lng',
            type: 'Longitude',
            isArray: false,
            shape: null
          }
        ]
      },
      {
        from: 'perimeter',
        to: 'perimeter',
        type: 'IndoorPerimeter',
        isArray: false,
        shape: [
          {
            from: 'shape',
            to: 'shape',
            type: 'ShapeType',
            isArray: false,
            shape: null
          },
          {
            from: 'points',
            to: 'points',
            type: 'IndoorPoint',
            isArray: true,
            shape: [
              {
                from: 's',
                to: 's',
                type: 'Int',
                isArray: false,
                shape: null
              },
              {
                from: 'b',
                to: 'b',
                type: 'Int',
                isArray: false,
                shape: null
              },
              {
                from: 'f',
                to: 'f',
                type: 'Int',
                isArray: false,
                shape: null
              },
              {
                from: 'x',
                to: 'x',
                type: 'Float',
                isArray: false,
                shape: null
              },
              {
                from: 'y',
                to: 'y',
                type: 'Float',
                isArray: false,
                shape: null
              }
            ]
          },
          {
            from: 'radius',
            to: 'radius',
            type: 'Float',
            isArray: false,
            shape: null
          },
          {
            from: '_id',
            to: 'id',
            type: 'ID',
            isArray: false,
            shape: null
          }
        ]
      },
      {
        from: '_id',
        to: 'id',
        type: 'ID',
        isArray: false,
        shape: null
      }
    ]
  },
  {
    from: 'geoIndoorTranslation',
    to: 'geoIndoorTranslation',
    type: 'GeoIndoorTranslation',
    isArray: false,
    shape: [
      {
        from: 'rotation',
        to: 'rotation',
        type: 'Rotation',
        isArray: false,
        shape: null
      },
      {
        from: 'geoPoint',
        to: 'geoPoint',
        type: 'GeoPoint',
        isArray: false,
        shape: [
          {
            from: 'lat',
            to: 'lat',
            type: 'Latitude',
            isArray: false,
            shape: null
          },
          {
            from: 'lng',
            to: 'lng',
            type: 'Longitude',
            isArray: false,
            shape: null
          }
        ]
      },
      {
        from: 'indoorPoint',
        to: 'indoorPoint',
        type: 'IndoorPoint',
        isArray: false,
        shape: [
          {
            from: 's',
            to: 's',
            type: 'Int',
            isArray: false,
            shape: null
          },
          {
            from: 'b',
            to: 'b',
            type: 'Int',
            isArray: false,
            shape: null
          },
          {
            from: 'f',
            to: 'f',
            type: 'Int',
            isArray: false,
            shape: null
          },
          {
            from: 'x',
            to: 'x',
            type: 'Float',
            isArray: false,
            shape: null
          },
          {
            from: 'y',
            to: 'y',
            type: 'Float',
            isArray: false,
            shape: null
          }
        ]
      }
    ]
  },
  {
    from: 'osmMapInfo',
    to: 'osmMapInfo',
    type: 'OSMMapInfo',
    isArray: false,
    shape: [
      {
        from: 'boundNorth',
        to: 'boundNorth',
        type: 'Latitude',
        isArray: false,
        shape: null
      },
      {
        from: 'boundSouth',
        to: 'boundSouth',
        type: 'Latitude',
        isArray: false,
        shape: null
      },
      {
        from: 'boundEast',
        to: 'boundEast',
        type: 'Longitude',
        isArray: false,
        shape: null
      },
      {
        from: 'boundWest',
        to: 'boundWest',
        type: 'Longitude',
        isArray: false,
        shape: null
      },
      {
        from: 'changeset',
        to: 'changeset',
        type: 'Int',
        isArray: false,
        shape: null
      },
      {
        from: 'mapKeys',
        to: 'mapKeys',
        type: 'String',
        isArray: true,
        shape: null
      }
    ]
  },
  {
    from: 'parent',
    to: 'parent',
    type: 'NetworkPlace',
    isArray: false,
    shape: null
  },
  {
    from: 'ancestors',
    to: 'ancestors',
    type: 'NetworkPlace',
    isArray: true,
    shape: null
  },
  {
    from: 'children',
    to: 'children',
    type: 'NetworkPlace',
    isArray: true,
    shape: null
  },
  {
    from: 'descendants',
    to: 'descendants',
    type: 'NetworkPlace',
    isArray: true,
    shape: null
  },
  {
    from: 'parentSite',
    to: 'parentSite',
    type: 'NetworkPlace',
    isArray: false,
    shape: null
  },
  {
    from: 'parentBuilding',
    to: 'parentBuilding',
    type: 'NetworkPlace',
    isArray: false,
    shape: null
  },
  {
    from: 'parentFloor',
    to: 'parentFloor',
    type: 'NetworkPlace',
    isArray: false,
    shape: null
  },
  {
    from: 'parentPOI',
    to: 'parentPOI',
    type: 'NetworkPlace',
    isArray: false,
    shape: null
  },
  {
    from: 'parentLandmark',
    to: 'parentLandmark',
    type: 'NetworkPlace',
    isArray: false,
    shape: null
  },
  {
    from: 'parentOffsite',
    to: 'parentOffsite',
    type: 'NetworkPlace',
    isArray: false,
    shape: null
  },
  { from: '_id', to: 'id', type: 'ID', isArray: false, shape: null },
  {
    from: 'createdAt',
    to: 'createdAt',
    type: 'AutoGraphDateTime',
    isArray: false,
    shape: null
  },
  {
    from: 'updatedAt',
    to: 'updatedAt',
    type: 'AutoGraphDateTime',
    isArray: false,
    shape: null
  }
];
